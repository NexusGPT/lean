// One reading of an element's `children` (patch.mjs kidsOf), held two ways.
// 1. Every exported reader, on every shape a `children` value takes: an array, one element, one text, one number, a
//    rendered value cut by render's depth bound ({$deep: true}, the shape named from the nexus-119 crash's own cached
//    row), null and undefined. Each reader must read the shape as kidsOf does: printed without the printer's fallback
//    note (formatOp is total, so a reader that throws would hide behind that note), diffed without "could not be
//    compared", a difference inside it found, a single child equal to a one-element list.
// 2. The source: every `<x>.children` in lean's element-tree code is read through kidsOf, or is one of the named
//    exceptions below, each with its reason and its exact count, so a new raw reader of the class fails here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatOp, witnessPatch, patch, kidsOf } from '../patch.mjs';
import { styledElements } from '../exec/styles.mjs';

const el = (tag, props, children) => ({ $el: tag, props, children });
const DEEP = { $deep: true };
const span = (t) => el('span', { className: 'p-2' }, [t]);
// shape name -> [children value, the list kidsOf must give]
const SHAPES = {
  array: [[span('a')], [span('a')]],
  element: [span('a'), [span('a')]],
  text: ['a', ['a']],
  number: [7, [7]],
  deep: [DEEP, [DEEP]],
  null: [null, []],
  undefined: [undefined, []],
};
const tree = (kids) => el('div', {}, [el('section', { className: 'm-1' }, kids)]);

for (const [name, [v, want]] of Object.entries(SHAPES)) {
  const at = `shape ${name}`;
  assert.deepEqual(kidsOf(v), want, `${at}: kidsOf`);
  for (const kind of ['insert', 'remove']) { // shortNode, through the op printer
    const op = kind === 'insert' ? { kind, path: 'p', before: null, after: tree(v) } : { kind, path: 'p', before: tree(v), after: null };
    const line = formatOp(op);
    assert.doesNotMatch(line, /not printed/, `${at}: ${kind} printed through the fallback: ${line}`);
    assert.match(line, new RegExp(`^p ${kind} <div><section className="m-1">`), `${at}: ${line}`);
    if (name === 'element' || name === 'array') assert.match(line, /<span className="p-2">"a"<\/span>/, `${at}: the child printed: ${line}`);
    if (name === 'text') assert.match(line, /<section className="m-1">"a"<\/section>/, `${at}: ${line}`);
  }
  // diffChildren, through patch: a shape is equal to itself; witnessPatch's equal-tree check (eraseFns, treeJson) agrees
  const same = patch(tree(v), tree(v));
  assert.equal(same.reason, undefined, `${at}: ${same.reason}`);
  assert.deepEqual([...same], [], `${at}: a shape differs from itself: ${JSON.stringify(same)}`);
  const w = witnessPatch({ tree: tree(v) }, { tree: tree(v) });
  assert.match(w.patchSummary, /^no tree difference/, `${at}: ${w.patchSummary}`);
  // a single child or a missing one equals its list form
  const asList = patch(tree(v), tree(want));
  assert.deepEqual([...asList], [], `${at}: differs from its list form: ${JSON.stringify(asList)} ${asList.reason ?? ''}`);
  // styledElements reads the same children: the span's class is found inside an element child
  const classes = styledElements(tree(v)).map((x) => x.className);
  assert.deepEqual(classes, name === 'element' || name === 'array' ? ['m-1', 'p-2'] : ['m-1'], `${at}: styledElements ${JSON.stringify(classes)}`);
}
// a difference inside a non-list child is found at its path, never read as equal and never a reason
for (const [name, a, b, path_] of [['element', span('a'), span('b'), 'div[0]/section[0]/span[0]'], ['text', 'a', 'b', 'div[0]/section[0]'], ['number', 7, 8, 'div[0]/section[0]']]) {
  const w = witnessPatch({ tree: tree(a) }, { tree: tree(b) });
  assert.equal(w.patchSummary, '1 text', `difference inside ${name}: ${JSON.stringify(w)}`);
  assert.equal(w.patch[0].path, path_, `difference inside ${name}: ${w.patch[0].path}`);
}

// 2. the source. Scope: lean's own element trees ({$el, props, children}). Not in scope, by what they read:
//    translate/ and lint/ read TypeScript's syntax tree (ts.JsxElement.children, a NodeArray), not an element tree;
//    exec/fake.mjs builds and renders values (lane callback-behaviour owns it); design/ holds prototypes; tests/ are tests.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = [/^tests\//, /^design\//, /^vendor\//, /^translate\//, /^lint\//, /^eslint\//, /node_modules/, /^exec\/fake\.mjs$/];
// file -> [raw `.children` count, why it is not kidsOf]. A count that changes either way fails: a new raw reader, or an
// exception that went away and should leave this list.
const EXCEPT = {
  'patch.mjs': [2, 'renderTree: a shape-preserving copy of exec/run.mjs renderTree (it renders, it does not iterate a non-array); the two copies are merged under row ce68c002'],
  'exec/run.mjs': [12, 'deepExpand, renderTree, observeJsx, eraseHandlers, treeHandlers read the sandbox jsxValue output, an array by jsxChildren; run.mjs is lane callback-behaviour\'s (a finding for the lead)'],
};
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), r = path.relative(root, p); if (OUT.some((x) => x.test(r))) continue; if (e.isDirectory()) walk(p); else if (r.endsWith('.mjs')) files.push(r); } };
walk(root);
const raw = {};
for (const r of files) {
  const lines = fs.readFileSync(path.join(root, r), 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/^\s*\/\//.test(ln)) return; // a comment line
    const code = ln.replace(/kidsOf\([^()]*\.children\)/g, ''); // a read through kidsOf
    const n = (code.match(/[\w)\]]\.children\b/g) ?? []).length;
    if (n) (raw[r] ??= []).push(`${r}:${i + 1} (${n})`);
  });
}
const problems = [];
for (const [r, hits] of Object.entries(raw)) {
  const n = hits.reduce((s, h) => s + Number(h.match(/\((\d+)\)$/)[1]), 0);
  if (!EXCEPT[r]) problems.push(`raw children reader outside kidsOf: ${hits.join(', ')}`);
  else if (EXCEPT[r][0] !== n) problems.push(`${r}: ${n} raw children reads, ${EXCEPT[r][0]} named (${hits.join(', ')})`);
}
for (const r of Object.keys(EXCEPT)) if (!raw[r]) problems.push(`${r}: named exception with no raw read left; remove it from EXCEPT`);
assert.deepEqual(problems, [], problems.join('\n'));
console.log(`children shapes: ${Object.keys(SHAPES).length} shapes read one way by formatOp, patch, witnessPatch, styledElements; ${files.length} files, every element-tree children read through kidsOf or named PASS`);
