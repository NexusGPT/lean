#!/usr/bin/env node
// Writes the pairs tests/pairs/opaque_<rule>/ of the opacity ladder for the statement and expression rules
// (design/w1b-opaque-statements.md), one spec per rule, each unit the same shape:
//   export function <unit>(<params>): <ret> { <pre> <construct> <ret statement> }
// and the candidate changes it four ways:
//   outside   the return bound to a local first (a change outside the construct, equal): PASS-proved, the step listed
//   inside    an edit inside the construct: another text, another symbol: not proved; lane B WITNESS
//   planted   exec/mutate.mjs's first planted change whose site lies inside the construct's statement: lane B WITNESS
//   upstream  an edit before the construct to a value only the construct reads: not proved (the step takes that value;
//             tests/opaque-statements.mjs --break drops the read and this unit proves falsely, which the test refuses)
// A boundary rule (its construct can make a value outside the model) has its construct confined to the world (a call
// statement) and adds `escapes`: the construct's value used after it, so the unit is one opaque function (the value
// boundary): a change elsewhere in it is not proved. A rule whose sites the translator reads whole-unit already
// (number-special, unary-coercion, division) has `unchanged` (proved), `escapes` and `caller` (a same-file caller,
// opaque too) instead.
//   node tests/opaque-statements-pairs.mjs            write every pair (lane B expectations from `b` in each spec)
//   node tests/opaque-statements-pairs.mjs <rule>     write one
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairs = path.join(here, 'pairs');
const mutate = path.join(here, '../exec/mutate.mjs');

// lane B's expected verdict per unit kind, unless a spec says otherwise
const B = { outside: 'PASS-bounded', inside: 'WITNESS', planted: 'WITNESS', upstream: 'WITNESS', escapes: 'PASS-bounded', unchanged: 'PASS-bounded', caller: 'PASS-bounded' };

export const SPECS = [
  { rule: 'loose-equality', params: 'a: number, b: { n: number } | number', ret: 'number',
    pre: ['const k = a + 1;', 'let r = 0;'], construct: 'if (k == b) r = 1;', retStmt: 'return r;',
    inside: ['k == b', 'k != b'], upstream: ['a + 1', 'a + 2'],
    why: '`k == b` between a number and a record-or-number follows ECMA-262 IsLooselyEqual (7.2.14), which the model does not read' },
  { rule: 'record-rest', params: 'm: Record<string, number>, x: number', ret: 'number',
    pre: ['const d: Record<string, number> = { ...m, q: x + 1 };'], construct: 'const { q, ...rest } = d;', retStmt: 'return Object.keys(rest).length + q;',
    inside: ['= d;', '= { ...d, q: 0 };'], upstream: ['q: x + 1', 'q: x + 2'],
    noPlanted: 'exec/mutate.mjs has no site inside `const { q, ...rest } = d;` (no operator, literal, branch or call)',
    why: 'a rest pattern of a dictionary has no datatype of remaining fields' },
  { rule: 'assignment-expression', params: 'x: number | undefined, y: number', ret: 'number',
    pre: ['let z = x;', 'const v = y + 1;'], construct: 'const w = (z ??= v * 2);', retStmt: 'return w;',
    inside: ['??=', '||='], upstream: ['y + 1', 'y + 2'],
    why: 'a logical assignment used as a value' },
  { rule: 'spread', params: 't: string', ret: 'string',
    pre: ['const s = t + "!";'], construct: 'const xs = [...s, "?"];', retStmt: 'return xs.join("-");',
    inside: ['"?"]', '"?", "x"]'], upstream: ['t + "!"', 't + "!!"'],
    why: 'a string spread into an array (its code points)' },
  { rule: 'for-in', params: 'x: number', ret: 'number',
    pre: ['const o2: Record<string, number> = { a: x, b: 1 };', 'let k = "";', 'let n = 0;'], construct: 'for (k in o2) n += 1;', retStmt: 'return n + k.length;',
    inside: ['n += 1', 'n += 3'], upstream: ['b: 1 }', 'b: 1, cc: 2 }'],
    why: 'a for-in whose binding is an outer `let`' },
  { rule: 'label', params: 'x: number', ret: 'number',
    pre: ['const g = x + 1;', 'let r = 0;'], construct: 'exit: { if (g > 1) break exit; r = 1; }', retStmt: 'return r;',
    inside: ['r = 1', 'r = 2'], upstream: ['x + 1', 'x + 2'],
    why: 'a label on a block, left by `break exit`' },
  { rule: 'bitwise', params: 'c: bigint', ret: 'bigint',
    pre: ['const b = c + 1n;'], construct: 'const r = (b & 3n) + c;', retStmt: 'return r;',
    inside: ['3n', '1n'], upstream: ['c + 1n', 'c + 2n'],
    why: '`&` on BigInt values' },
  { rule: 'mixed-types', params: 'x: number | { o: number }, y: number', ret: 'boolean',
    pre: ['const t = y + 1;'], construct: 'const same = x === t;', retStmt: 'return same;',
    inside: ['x === t', 'x !== t'], upstream: ['y + 1', 'y + 2'],
    why: '`===` between a primitive-or-record union and a value that is not a literal' },
  { rule: 'destructuring', params: 'xs: number[]', ret: 'number',
    pre: ['const i = xs.length - 1;', 'let n = 0;'], construct: 'try { n = xs[i] * 2; } catch ({ message }: any) { n = -1; }', retStmt: 'return n;',
    inside: ['* 2', '* 3'], upstream: ['xs.length - 1', 'xs.length - 2'],
    why: 'a catch clause that binds a pattern' },
  { rule: 'param-form', params: 'k: number', ret: 'number',
    pre: ['const m = k + 1;'], construct: 'function inner(...ys: number[]) { return ys.length + m; }', retStmt: 'return inner(1, 2);',
    inside: ['ys.length + m', 'ys.length - m'], upstream: ['k + 1', 'k + 2'],
    why: 'a rest parameter of a nested function' },
  // boundary rules: the construct confined to the world (a call statement), and `escapes`
  { rule: 'string-code-unit', boundary: true, params: 'n: number, sink: (s: string) => void', ret: 'number',
    pre: ['const t = n + 1;', 'const u = n * 2;'], construct: 'sink("\u{1F600}" + u);', retStmt: 'return t;',
    inside: ['"\u{1F600}"', '"\u{1F601}"'], upstream: ['n * 2', 'n * 3'],
    escapes: { params: 'n: number', ret: 'number', body: ['const s = "\u{1F600}" + n;', 'return s.length + n;'], change: ['return s.length + n;', 'return n + s.length;'] },
    why: 'an astral string literal (two UTF-16 code units, outside the BMP envelope of the string model)' },
  { rule: 'math-empty', boundary: true, params: 'xs: number[], k: number, sink: (n: number) => void', ret: 'number',
    pre: ['const t = k + 1;', 'const u = k * 2;'], construct: 'sink(Math.max(...xs, u));', retStmt: 'return t;',
    inside: ['Math.max', 'Math.min'], upstream: ['k * 2', 'k * 3'],
    escapes: { params: 'xs: number[], k: number', ret: 'number', body: ['const m = Math.max(...xs);', 'return m + k;'], change: ['return m + k;', 'return k + m;'] },
    why: '`Math.max` of a list that may be empty (-Infinity)' },
  { rule: 'collection-iterator', boundary: true, params: 'm: Map<string, number>, k: number, sink: (it: Iterable<string>, n: number) => void', ret: 'number',
    pre: ['const t = k + 1;', 'const u = k * 2;'], construct: 'sink(m.keys(), u);', retStmt: 'return t;',
    inside: ['m.keys(), u', 'm.keys(), u + 1'], upstream: ['k * 2', 'k * 3'],
    escapes: { params: 'm: Map<string, number>, k: number', ret: 'number', body: ['const it = m.keys();', 'return [...it].length + k;'], change: ['return [...it].length + k;', 'return k + [...it].length;'] },
    why: 'a Map iterator passed on: its first read uses it up' },
  // the translator reads these sites whole-unit (the numeric boundary, subset.md "Numeric special boundary")
  { rule: 'number-special', whole: true, params: 'x: number', ret: 'number', body: ['if (x > 0) return NaN;', 'return x + 1;'], change: ['return x + 1;', 'return 1 + x;'],
    why: 'the bare global NaN' },
  { rule: 'unary-coercion', whole: true, params: 'o: { v: number }, k: number', ret: 'number', body: ['const n = +(o as any);', 'return n + k;'], change: ['return n + k;', 'return k + n;'],
    why: 'unary + on an object (ToNumber of an object, NaN here)' },
  { rule: 'division', whole: true, params: 'x: number', ret: 'number', body: ['let y = x;', 'y /= 2;', 'return y + 1;'], change: ['return y + 1;', 'return 1 + y;'],
    why: 'compound division in an integer file (a fraction where the model holds an integer)' },
];

const fn = (name, params, ret, lines) => `export function ${name}(${params}): ${ret} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`;
const replaceIn = (text, old, neu, what) => { if (!text.includes(old)) throw new Error(`${what}: no \`${old}\``); return text.replace(old, neu); };

function plantedIndex(file, unit, construct) {
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf(construct, text.indexOf(`export function ${unit}(`));
  const listed = spawnSync('node', ['--input-type=module', '-e', `import(${JSON.stringify(mutate)}).then((m) => console.log(JSON.stringify(m.sitesOf(${JSON.stringify(file)}, ${JSON.stringify(unit)}, { project: false }).sites)))`], { encoding: 'utf8' });
  if (listed.status !== 0) throw new Error(`mutate sites of ${unit}: ${listed.stderr}`);
  const i = JSON.parse(listed.stdout).findIndex((s) => s.start >= at && s.end <= at + construct.length); // the first planted change inside the construct's statement
  if (i < 0) throw new Error(`${unit}: no planted site inside the construct`);
  return i;
}

function write(spec) {
  const dir = path.join(pairs, `opaque_${spec.rule.replace(/-/g, '_')}`);
  fs.mkdirSync(dir, { recursive: true });
  const header = `// the opacity ladder, rule ${spec.rule} (design/w1b-opaque-statements.md): ${spec.why}; its statement is one opaque step\n`;
  let parent = header, candidate = header;
  const expect = { scope: [], equal: {}, opaque: {}, planted: {}, b: {} };
  const unit = (name, eq, b) => { expect.scope.push(name); expect.equal[name] = eq; expect.opaque[name] = [spec.rule]; expect.b[name] = spec.b?.[name] ?? b; };
  if (spec.whole) {
    const body = spec.body;
    parent += fn('unchanged', spec.params, spec.ret, body) + fn('escapes', spec.params, spec.ret, body) + fn('caller', spec.params, spec.ret, [`const v = escapes(${spec.params.split(',').map((p) => p.split(':')[0].trim()).join(', ')});`, 'return v + 1;']);
    candidate += fn('unchanged', spec.params, spec.ret, body) + fn('escapes', spec.params, spec.ret, body.map((l) => (l === spec.change[0] ? spec.change[1] : l))) + fn('caller', spec.params, spec.ret, [`const v = escapes(${spec.params.split(',').map((p) => p.split(':')[0].trim()).join(', ')});`, 'return 1 + v;']);
    unit('unchanged', true, B.unchanged); unit('escapes', false, B.escapes); unit('caller', false, B.caller); expect.opaque.caller = [];
    delete expect.planted;
    expect.why = `The opacity ladder (design/w1b-opaque-statements.md), rule ${spec.rule}: ${spec.why}. The construct can make a value outside the model, and the translator reads its unit whole (the numeric boundary): the unit is one opaque function keyed by its source and the same-file units it reaches, and every same-file caller is one too, so no exact reading meets the value. unchanged: one key on both sides, proved. escapes: a reordered return changes the source, another symbol, not proved (lane B: the same behaviour, PASS-bounded). caller: it reaches escapes, so it is opaque too and its own reordering is not proved; its record lists no site of its own.`;
  } else {
    const units = ['outside', 'inside', 'planted', 'upstream'];
    for (const u of units) parent += fn(u, spec.params, spec.ret, [...spec.pre, spec.construct, spec.retStmt]);
    const pf = path.join(dir, 'parent.ts');
    fs.writeFileSync(pf, parent);
    let index = null, plantedFn = fn('planted', spec.params, spec.ret, [...spec.pre, spec.construct, spec.retStmt]);
    if (!spec.noPlanted) {
      index = plantedIndex(pf, 'planted', spec.construct);
      const mutated = spawnSync('node', [mutate, pf, '--unit', 'planted', '--index', String(index), '--out', path.join(dir, '.planted.ts')], { encoding: 'utf8' });
      if (mutated.status !== 0) throw new Error(mutated.stderr);
      const applied = JSON.parse(mutated.stdout).site; // mutate.mjs skips a change that breaks the syntax or the types: the one applied must be inside too
      const at = parent.indexOf(spec.construct, parent.indexOf('export function planted('));
      if (!(applied.start >= at && applied.end <= at + spec.construct.length)) throw new Error(`${spec.rule}: the planted change applied lies outside the construct`);
      const plantedText = fs.readFileSync(path.join(dir, '.planted.ts'), 'utf8'); fs.rmSync(path.join(dir, '.planted.ts'));
      plantedFn = plantedText.slice(plantedText.indexOf('export function planted('), plantedText.indexOf('export function upstream('));
    }
    const retExpr = spec.retStmt.replace(/^return\s+/, '').replace(/;$/, '');
    candidate += fn('outside', spec.params, spec.ret, [...spec.pre, spec.construct, `const out_ = ${retExpr};`, 'return out_;']);
    candidate += fn('inside', spec.params, spec.ret, [...spec.pre, replaceIn(spec.construct, spec.inside[0], spec.inside[1], `${spec.rule} inside`), spec.retStmt]);
    candidate += plantedFn;
    candidate += fn('upstream', spec.params, spec.ret, [...spec.pre.map((l) => (l.includes(spec.upstream[0]) ? l.replace(spec.upstream[0], spec.upstream[1]) : l)), spec.construct, spec.retStmt]);
    if (!spec.pre.some((l) => l.includes(spec.upstream[0]))) throw new Error(`${spec.rule} upstream: no \`${spec.upstream[0]}\` before the construct`);
    unit('outside', true, B.outside); unit('inside', false, B.inside); unit('upstream', false, B.upstream);
    if (index !== null) { unit('planted', false, B.planted); expect.planted = { planted: index }; } else { expect.planted = {}; expect.noPlanted = spec.noPlanted; }
    if (spec.boundary) {
      const e = spec.escapes;
      parent += fn('escapes', e.params, e.ret, e.body);
      candidate += fn('escapes', e.params, e.ret, e.body.map((l) => (l === e.change[0] ? e.change[1] : l)));
      unit('escapes', false, B.escapes);
    }
    expect.why = `The opacity ladder (design/w1b-opaque-statements.md), rule ${spec.rule}: ${spec.why}, which the model does not read, so the statement \`${spec.construct}\` is one opaque step: an uninterpreted transition keyed by its text and the same-file definitions it names, reading every local it mentions, writing every local it assigns. outside: the step unchanged and the return bound to a local, proved modulo the step. inside: \`${spec.inside[1]}\` for \`${spec.inside[0]}\` is another text, another symbol, not proved; lane B finds the difference. ${index !== null ? `planted: exec/mutate.mjs's site ${index} inside the step, not proved, lane B WITNESS.` : `planted: none (${spec.noPlanted}); the unit is the parent's, unchanged.`} upstream: \`${spec.upstream[1]}\` for \`${spec.upstream[0]}\` changes a value only the step reads; the step takes it, so nothing is proved (tests/opaque-statements.mjs --break drops that read and this unit proves falsely).${spec.boundary ? ' The construct can make a value outside the model (a boundary rule), so the step is confined to the world: escapes uses the value after it, its unit is one opaque function (the value boundary), and a reordered return there is not proved.' : ''}`;
  }
  fs.writeFileSync(path.join(dir, 'parent.ts'), parent);
  fs.writeFileSync(path.join(dir, 'candidate.ts'), candidate);
  fs.writeFileSync(path.join(dir, 'expect.json'), JSON.stringify(expect, null, 2) + '\n');
  return dir;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const only = process.argv[2];
  for (const spec of SPECS) if (!only || spec.rule === only) console.log(write(spec));
}
