// A test for a unit no parent holds (design/new-unit-test.md): lean ran the unit on drawn inputs and recorded what each
// closed call returned or threw (new-unit.mjs runNew: a closed call is one the declared types admit and that asked nothing
// of lean's world). The cases below restate those observations as a test the repository's own runner can run. The test
// locks the unit's behaviour as submitted; it finds no bug by itself. Beside it the record keeps the numbers that say what
// the test is: the unit's statements the kept cases complete, and the mutants lean plants in the unit that the cases tell
// apart. Before it is proposed, the test runs under lean's own runner model (new-tests.mjs) against the candidate: every
// case must pass and the run must ask nothing of the world.
import fs from 'node:fs';
import path from 'node:path';
import { broken } from '../break.mjs';
import { runTests } from './new-tests.mjs';
import { inputsFor } from './gen.mjs';
import { edgeInput } from './declared.mjs';
import { pickUnit, observe } from './run.mjs';
import { Environment, render } from './fake.mjs';
import { sitesOf, mutate } from './mutate.mjs';
import { setVirtual } from './new-unit.mjs';
import { ts } from '../common.mjs';
import { CLOCK_EPOCH } from './record.mjs';

export const CASES = 12; // the cases a proposed test holds at most (design/constants.md)
export const MUTANTS = 24; // the mutants planted in the unit at most, every kind once first (design/constants.md)
export const KILL_MS = 60000; // the wall the mutant loop may take per unit

// a rendered value (fake.mjs render) holds a value of lean's world, or one no test can restate by value
const WORLD_TAGS = ['$fake', '$fn', '$deep', '$cycle', '$symbol'];
export function holdsWorld(v, depth = 0) {
  if (!v || typeof v !== 'object' || depth > 12) return false;
  if (Array.isArray(v)) return v.some((x) => holdsWorld(x, depth + 1));
  for (const t of WORLD_TAGS) if (Object.hasOwn(v, t)) return true;
  if (Object.hasOwn(v, '$promise') && !Object.hasOwn(v, 'settled')) return true;
  return Object.values(v).some((x) => holdsWorld(x, depth + 1));
}
const holdsUndefined = (v, depth = 0) => !!v && typeof v === 'object' && depth < 12 && (Object.hasOwn(v, '$undefined') || (Array.isArray(v) ? v : Object.values(v)).some((x) => holdsUndefined(x, depth + 1)));

// ----- the source: a rendered value printed as JavaScript (LEAN_BREAK=new-test-source: every value prints as null) -----
export function toSource(v, shared = null) {
  if (broken('new-test-source')) return 'null';
  if (v === null) return 'null';
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => toSource(x, shared)).join(', ')}]`;
  if (typeof v !== 'object') throw new Error(`no source for a ${typeof v}`);
  if (Object.hasOwn(v, '$undefined')) return 'undefined';
  if (Object.hasOwn(v, '$input')) return v.$input; // (lane w9al) an argument stubbed from lean's answers, by its name
  if (Object.hasOwn(v, '$nan')) return 'NaN';
  if (Object.hasOwn(v, '$negativeZero')) return '-0';
  if (Object.hasOwn(v, '$infinity')) return v.$infinity < 0 ? '-Infinity' : 'Infinity';
  if (Object.hasOwn(v, '$bigint')) return `${v.$bigint}n`;
  if (Object.hasOwn(v, '$date')) return v.$date === 'invalid' ? 'new Date(NaN)' : `new Date(${JSON.stringify(v.$date)})`;
  if (Object.hasOwn(v, '$regex')) return String(v.$regex);
  if (Object.hasOwn(v, '$map')) return `new Map([${v.$map.map(([k, x]) => `[${toSource(k, shared)}, ${toSource(x, shared)}]`).join(', ')}])`;
  if (Object.hasOwn(v, '$set')) return `new Set([${v.$set.map((x) => toSource(x, shared)).join(', ')}])`;
  if (Object.hasOwn(v, '$error')) return v.$error === 'Error' || !v.$error ? `new Error(${JSON.stringify(String(v.message ?? ''))})` : `Object.assign(new Error(${JSON.stringify(String(v.message ?? ''))}), { name: ${JSON.stringify(v.$error)} })`;
  if (Object.hasOwn(v, '$promise')) return `Promise.resolve(${toSource(v.settled, shared)})`;
  if (Object.hasOwn(v, '$ref')) { if (!shared) throw new Error('a shared value outside a sharing scope'); if (Object.hasOwn(v, 'value')) { shared.defs.push(`const s${v.$ref} = ${toSource(v.value, shared)};`); } return `s${v.$ref}`; }
  for (const t of WORLD_TAGS) if (Object.hasOwn(v, t)) throw new Error(`no source for a value of lean's world (${t})`);
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  return `{ ${keys.map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${toSource(v[k], shared)}`).join(', ')} }`;
}

// ----- the runner the repository uses, read from the nearest package.json (the dialect the test is written in) -----
export function runnerOf(file) {
  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'package.json');
    if (fs.existsSync(p)) {
      let pkg = {}; try { pkg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* a manifest that does not parse names no runner */ }
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }, test = String(pkg.scripts?.test ?? '');
      if (/\bvitest\b/.test(test) || deps.vitest) return { runner: 'vitest', dir };
      if (/\bjest\b/.test(test) || deps.jest) return { runner: 'jest', dir };
      if (/\bmocha\b/.test(test) || deps.mocha) return { runner: 'mocha', dir };
      if (/\bnode\b.*--test\b/.test(test)) return { runner: 'node:test', dir };
      if (pkg.name || pkg.scripts) return { runner: null, dir };
    }
    if (path.dirname(dir) === dir) return { runner: null, dir: path.dirname(path.resolve(file)) };
  }
}
// where the test file goes: the package's `__tests__` folder beside the unit when the package uses one, else beside the unit
function placeOf(file, unit, runner) {
  const dir = path.dirname(path.resolve(file)), ext = path.extname(file) || '.ts';
  const base = path.basename(file, ext), name = `${base}.${unit.replace(/[^\w$]+/g, '_')}.lean.test${ext}`;
  const tests = path.join(dir, '__tests__');
  const useFolder = fs.existsSync(tests) && fs.statSync(tests).isDirectory();
  return { file: useFolder ? path.join(tests, name) : path.join(dir, name), importFrom: `${useFolder ? '../' : './'}${base}` };
}

// ----- (lane w9al) the world of a case: what lean answered the unit's requests, restated as stubs -----
// A call that asked lean's world is a case when every request it made is one a test can answer by itself and every answer
// prints as a value (design/w9al-world-stubs.md). The requests and answers are lean's own (fake.mjs answerOf): fetch
// answered by its table, the clock, Math.random, a package lean fakes (its member called), each with the value it handed
// the unit, in request order. The test stubs each surface with those answers in that order and asserts the requests made.
const STUB_GLOBALS = new Set(['fetch']); // a global the unit's static reach names (`names G`) that a test stubs by name
const STUB_TAGS = new Set(['$undefined', '$nan', '$negativeZero', '$infinity', '$bigint', '$date', '$regex', '$map', '$set', '$error', '$promise', '$response', '$fields']);
// a rendered value toSource prints as the value itself (no handle of lean's world, no rendering of a platform object it does not print)
export function stubPrintable(v, depth = 0) {
  if (!v || typeof v !== 'object') return true;
  if (depth > 12 || holdsWorld(v)) return false;
  if (Array.isArray(v)) return v.every((x) => stubPrintable(x, depth + 1));
  return Object.keys(v).every((k) => (!k.startsWith('$') || STUB_TAGS.has(k)) && stubPrintable(v[k], depth + 1));
}
const isNavigation = (a, rest) => a.op === 'get' && a.shown?.returns && typeof a.shown.returns === 'object' && Object.hasOwn(a.shown.returns, '$fake') && rest.some((b) => b.path === a.path || [`${a.path}.`, `${a.path}(`, `${a.path}#`].some((x) => b.path.startsWith(x)));
// the surface a request reaches: a package's member (by the specifier the unit imports it under), a global by name, the clock, Math.random
function surfaceOf(a, specifiers) {
  const refuse = (why) => ({ refused: `${a.op} ${a.path}: ${why}` });
  if (a.clock !== undefined) return a.path === 'Date.now' || a.path === 'Date' ? { kind: 'clock', read: a.path === 'Date.now' && a.op === 'call' ? 'now' : a.op === 'new' ? 'new' : 'string' } : refuse('a clock no runner fakes by itself');
  if (a.path === 'Math.random') return { kind: 'random' };
  if (a.path.startsWith('global:')) { const name = a.path.slice(7); return a.op === 'call' && /^[A-Za-z_$][\w$]*$/.test(name) ? { kind: 'global', name } : refuse('a global read as a value'); }
  if (a.path.startsWith('module:')) {
    const spec = specifiers.filter((x) => a.path === `module:${x}` || a.path.startsWith(`module:${x}.`)).sort((x, y) => y.length - x.length)[0];
    if (!spec) return refuse('a package the run did not link by name');
    let rest = a.path.slice(`module:${spec}`.length).replace(/^\./, '');
    if (rest === 'default') rest = ''; else if (rest.startsWith('default.')) rest = rest.slice(8);
    if (a.op !== 'call') return refuse(a.op === 'get' ? 'a value read from the package (a stub of a module answers calls)' : 'a class of the package constructed');
    if (rest !== '' && !/^[A-Za-z_$][\w$]*$/.test(rest)) return refuse('a member of a value the package answered');
    return { kind: 'module', spec, member: rest };
  }
  return refuse('a request no stub answers by itself');
}
// (lane w9al) the handles of lean's world a case's arguments hold (an argument drawn as a service, an interface lean
// answers member by member: `arg0`, `arg1.store`): their paths, or null when an argument holds a world value no input
// stub restates (a function, a symbol, a cycle, a cut-off depth, an unsettled promise, a handle that is not the input's)
export function inputHandles(args) {
  const out = []; let other = false;
  const walk = (v, d) => {
    if (other || !v || typeof v !== 'object') return;
    if (d > 12) { other = true; return; }
    if (Array.isArray(v)) { v.forEach((x) => walk(x, d + 1)); return; }
    if (Object.hasOwn(v, '$fake')) { if (/^arg\d+(?:\.[A-Za-z_$][\w$]*)*$/.test(String(v.$fake))) out.push(v.$fake); else other = true; return; }
    if (['$fn', '$deep', '$cycle', '$symbol'].some((t) => Object.hasOwn(v, t)) || (Object.hasOwn(v, '$promise') && !Object.hasOwn(v, 'settled'))) { other = true; return; }
    Object.values(v).forEach((x) => walk(x, d + 1));
  };
  walk(args, 0);
  return other ? null : out;
}
// a request on an input handle: a member read (its value) or a member called (its answers), by its path below the handle
function inputOf(a, handles) {
  const root = handles.filter((h) => a.path === h || a.path.startsWith(`${h}.`)).sort((x, y) => y.length - x.length)[0];
  if (!root) return null;
  const refuse = (why) => ({ refused: `${a.op} ${a.path}: ${why}` });
  const member = a.path.slice(root.length + 1);
  if (!member) return refuse('an argument the unit calls (a handed function: lane w9am)');
  if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(member)) return refuse('a member of an argument read by index or through a call');
  if (a.op !== 'get' && a.op !== 'call') return refuse('an argument constructed');
  if (a.op === 'get' && a.shown?.returns && typeof a.shown.returns === 'object' && Object.hasOwn(a.shown.returns, '$fake')) return refuse('the unit holds a handle the argument answered as a value');
  return { kind: 'input', root, member };
}
// LEAN_BREAK=new-test-world (with runNew's): a case that asked the world is never usable
export function worldOf(c, { specifiers = [], dialect = 'vitest', handles = [] } = {}) {
  const w = c.world;
  if (!w) return { answers: [] }; // an input handle the call never read is passed as an empty object
  if (broken('new-test-world')) return { refused: 'the world of a case is not read' };
  for (const g of w.graph ?? []) { const m = /^names ([A-Za-z_$][\w$]*) \(/.exec(g); if (!m || !STUB_GLOBALS.has(m[1])) return { refused: `the unit's reach: ${g}` }; }
  for (const t of w.trace) if (!['get', 'call', 'new', 'fault'].includes(t.op)) return { refused: `${t.op} ${t.path}: a request no stub answers by itself` };
  if (w.pending?.length) return { refused: `the call armed ${w.pending[0]}, which a stub does not fire` };
  const answers = [];
  for (const [k, a] of w.answers.entries()) {
    if (isNavigation(a, w.answers.slice(k + 1))) continue;
    if (a.op === 'get' && a.path.startsWith('module:') && a.shown?.returns && typeof a.shown.returns === 'object' && Object.hasOwn(a.shown.returns, '$fake')) return { refused: `get ${a.path}: the unit holds a handle of the package as a value` };
    if (a.callback) return { refused: `${a.op} ${a.path}: the unit hands the world a function, which a stub would have to run` };
    const surface = inputOf(a, handles) ?? surfaceOf(a, specifiers);
    if (surface.refused) return surface;
    if (surface.kind === 'module' && (dialect === 'node:test' || dialect === 'mocha')) return { refused: `${a.op} ${a.path}: a package stub needs the runner's module mock, which ${dialect} has not by default` };
    const shown = a.clock !== undefined ? { returns: (surface.read === 'string' ? 0 : CLOCK_EPOCH) + a.clock } : a.shown;
    if (surface.kind === 'clock' && surface.read === 'string') return { refused: `call ${a.path}: the clock read as a string` };
    if (!shown || !stubPrintable(shown)) return { refused: `${a.op} ${a.path}: the world answered a value no test restates (${JSON.stringify(shown ?? null).slice(0, 80)})` };
    answers.push({ ...surface, op: a.op, path: a.path, args: a.args ?? [], shown });
  }
  // every request on the trace is one an answer restates (a bridge's call, a write, a read a stub does not answer refuse)
  const left = new Map(); for (const a of answers) left.set(`${a.op} ${a.path}`, (left.get(`${a.op} ${a.path}`) ?? 0) + 1);
  for (const t of w.trace) { if (t.op !== 'call' && t.op !== 'new') continue; const k = `${t.op} ${t.path}`; if (!left.get(k)) return { refused: `${k}: a request no answer restates` }; left.set(k, left.get(k) - 1); }
  const clock = answers.filter((a) => a.kind === 'clock');
  if (new Set(clock.map((a) => a.shown.returns)).size > 1 && clock.some((a) => a.read !== 'now')) return { refused: `the clock read ${clock.length} times at different instants, through new Date` };
  if (clock.some((a) => a.read !== 'now') && (dialect === 'node:test' || dialect === 'mocha')) return { refused: `new Date: a fake clock needs the runner's timers, which ${dialect} has not by default` };
  return { answers };
}

// a value an answer hands back, as source: an error with its own fields, a fetch response as the platform builds it
const ERRORS = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError']);
function answerSource(v) {
  if (v && typeof v === 'object' && Object.hasOwn(v, '$response')) { const r = v.$response; return `new Response(${toSource(r.body ?? null)}, { status: ${r.status}, statusText: ${JSON.stringify(r.statusText ?? '')}, headers: ${toSource(Object.fromEntries(r.headers ?? []))} })`; }
  if (v && typeof v === 'object' && Object.hasOwn(v, '$error')) {
    const cls = ERRORS.has(v.$error) ? v.$error : 'Error', made = `new ${cls}(${JSON.stringify(String(v.message ?? ''))})`;
    const fields = { ...(v.$fields ?? {}), ...(cls !== v.$error && v.$error ? { name: v.$error } : {}) };
    return Object.keys(fields).length ? `Object.assign(${made}, ${toSource(fields)})` : made;
  }
  return toSource(v);
}
// the answer as a mock's next result (the runners' mock API) or as a thunk (a stub written by hand)
const onceOf = (shown) => (Object.hasOwn(shown, 'returns') ? `.mockReturnValueOnce(${answerSource(shown.returns)})` : Object.hasOwn(shown, 'throws') ? `.mockImplementationOnce(() => { throw ${answerSource(shown.throws)}; })` : Object.hasOwn(shown, 'resolves') ? `.mockResolvedValueOnce(${answerSource(shown.resolves)})` : `.mockRejectedValueOnce(${answerSource(shown.rejects)})`);
const thunkOf = (shown) => (Object.hasOwn(shown, 'returns') ? `() => ${answerSource(shown.returns)}` : Object.hasOwn(shown, 'throws') ? `() => { throw ${answerSource(shown.throws)}; }` : Object.hasOwn(shown, 'resolves') ? `() => Promise.resolve(${answerSource(shown.resolves)})` : `() => Promise.reject(${answerSource(shown.rejects)})`);
const aliasOf = (spec) => `stub_${spec.replace(/[^\w$]+/g, '_')}`;
const keyOf = (a) => (a.kind === 'module' ? `module ${a.spec} ${a.member}` : a.kind === 'global' ? `global ${a.name}` : a.kind);

// (lane w9al) a case's input handles as object literals built from lean's answers: a member read is its value, a member
// called a mock with its answers in call order (a recorder by hand in node:test and mocha), a member read through is a
// nested object; the argument is passed by its name (`$input`) and its called members are asserted like every stub
function inputsOf(c, D, before, targets, out) {
  const roots = new Map();
  for (const a of c.worldAnswers ?? []) if (a.kind === 'input') { if (!roots.has(a.root)) roots.set(a.root, []); roots.get(a.root).push(a); }
  const handles = inputHandles(c.args) ?? [];
  for (const h of handles) if (!roots.has(h)) roots.set(h, []);
  const names = new Map([...roots.keys()].map((r) => [r, `input_${r.replace(/[^\w$]+/g, '_')}`]));
  for (const [root, as] of [...roots].sort((x, y) => y[0].length - x[0].length)) { // an inner handle first: an outer one may hold it
    const tree = {};
    for (const a of as) {
      const segs = a.member.split('.'); let node = tree;
      for (const sgm of segs.slice(0, -1)) { const next = node[sgm] ??= { $node: {} }; if (!next.$node) throw new Error(`${a.path}: a member read both as a value and through`); node = next.$node; }
      const last = segs.at(-1), have = node[last];
      if (a.op === 'get') { if (have && !Object.hasOwn(have, '$value')) throw new Error(`${a.path}: a member read both as a value and as a handle`); if (!have) { node[last] = { $value: a.shown.returns }; out.stubs++; } }
      else { if (have && !have.$calls) throw new Error(`${a.path}: a member both read and called`); (node[last] ??= { $calls: [] }).$calls.push(a); out.stubs++; }
    }
    const inner = [...names].filter(([r]) => r !== root && r.startsWith(`${root}.`));
    for (const [r, n] of inner) { const segs = r.slice(root.length + 1).split('.'); let node = tree; for (const sgm of segs.slice(0, -1)) node = (node[sgm] ??= { $node: {} }).$node; node[segs.at(-1)] = { $ref: n }; }
    const name = names.get(root);
    const print = (node, at) => `{ ${Object.entries(node).map(([k, v]) => {
      const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k), expr = `${at}.${k}`;
      if (v.$ref) return `${key}: ${v.$ref}`;
      if (v.$node) return `${key}: ${print(v.$node, expr)}`;
      if (Object.hasOwn(v, '$value')) return `${key}: ${answerSource(v.$value)}`;
      if (D) { targets.push({ expr, answers: v.$calls }); return `${key}: ${D}.fn()${v.$calls.map((a) => onceOf(a.shown)).join('')}`; }
      const rec = `${expr.replace(/[^\w$]+/g, '_')}Stub`;
      before.push(`const ${rec} = { calls: [], answers: [${v.$calls.map((a) => thunkOf(a.shown)).join(', ')}] };`);
      targets.push({ plain: rec, answers: v.$calls });
      return `${key}: (...args) => { ${rec}.calls.push(args); const next = ${rec}.answers.shift(); if (!next) throw new Error(${JSON.stringify(`${expr}: called past the answers the test holds`)}); return next(); }`;
    }).join(', ')} }`.replace('{  }', '{}');
    before.push(`const ${name} = ${print(tree, name)};`);
  }
  if (roots.size) { const swap = (v) => (Array.isArray(v) ? v.map(swap) : v && typeof v === 'object' ? (Object.hasOwn(v, '$fake') && names.has(v.$fake) ? { $input: names.get(v.$fake) } : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]))) : v); c.argsShown = swap(c.args); out.surfaces.add('input'); }
}

// the stubs of the kept cases in the runner's dialect: file-level lines (imports, the hoisted module mocks, a hook that
// undoes every stub after each test) and, per case, the lines before its call and the stubs whose calls it asserts.
// The module mock holds every member the unit's file imports from the specifier and every member a case called.
// LEAN_BREAK=new-test-stubs: no stub is written, so the test asks the real world
export function stubsOf(kept, dialect, imported = new Map()) {
  const out = { imports: [], hoisted: [], hooks: [], cases: new Map(), stubs: 0, surfaces: new Set() };
  if (broken('new-test-stubs')) { for (const c of kept) out.cases.set(c, { before: [], targets: [], restore: [] }); return out; }
  const D = dialect === 'jest' ? 'jest' : 'vi', plain = dialect === 'node:test' || dialect === 'mocha';
  const modules = new Map(); const used = new Set();
  for (const c of kept) for (const a of c.worldAnswers ?? []) { out.surfaces.add(a.kind === 'module' ? `module:${a.spec}` : a.kind === 'global' ? `global:${a.name}` : a.kind === 'clock' ? 'clock' : a.kind === 'input' ? 'input' : 'Math.random'); if (a.kind === 'module') { const m = modules.get(a.spec) ?? new Set(imported.get(a.spec) ?? []); m.add(a.member); modules.set(a.spec, m); } }
  for (const [spec, members] of modules) {
    const alias = aliasOf(spec), named = [...members].filter((m) => m !== '' && m !== 'default').sort();
    out.imports.push(`import * as ${alias} from ${JSON.stringify(spec)};`);
    const m = `{ ${named.map((x) => `${x}: ${D}.fn()`).join(', ')} }`;
    out.hoisted.push(members.has('') ? `${D}.mock(${JSON.stringify(spec)}, () => { const m = ${m}; return { ...m, default: Object.assign(${D}.fn(), m) }; });` : `${D}.mock(${JSON.stringify(spec)}, () => { const m = ${m}; return { ...m, default: m }; });`);
  }
  for (const c of kept) {
    const before = [], targets = [], restore = [], groups = new Map();
    inputsOf(c, plain ? null : D, before, targets, out);
    for (const a of c.worldAnswers ?? []) { if (a.kind === 'input') continue; const k = keyOf(a); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(a); }
    for (const [k, as] of groups) {
      const a0 = as[0]; out.stubs += as.length;
      if (plain) {
        const holder = a0.kind === 'random' ? 'Math' : a0.kind === 'clock' ? 'Date' : 'globalThis', member = a0.kind === 'random' ? 'random' : a0.kind === 'clock' ? 'now' : a0.name;
        const v = `${member}Stub`;
        before.push(`const ${v} = { calls: [], answers: [${as.map((a) => thunkOf(a.shown)).join(', ')}], saved: ${holder}.${member} };`, `${holder}.${member} = (...args) => { ${v}.calls.push(args); const next = ${v}.answers.shift(); if (!next) throw new Error(${JSON.stringify(`${holder}.${member}: called past the answers the test holds`)}); return next(); };`);
        restore.push(`${holder}.${member} = ${v}.saved;`);
        if (a0.kind !== 'clock') targets.push({ plain: v, answers: as });
        continue;
      }
      if (a0.kind === 'module') { const target = `${aliasOf(a0.spec)}.${a0.member === '' ? 'default' : a0.member}`; before.push(`${D}.mocked(${target})${as.map((a) => onceOf(a.shown)).join('')};`); targets.push({ expr: target, answers: as }); used.add('reset'); continue; }
      if (a0.kind === 'global') {
        const v = `${a0.name}Stub`;
        if (D === 'vi') { before.push(`const ${v} = vi.fn()${as.map((a) => onceOf(a.shown)).join('')};`, `vi.stubGlobal(${JSON.stringify(a0.name)}, ${v});`); used.add('globals'); }
        else { before.push(`const ${v} = jest.spyOn(globalThis, ${JSON.stringify(a0.name)})${as.map((a) => onceOf(a.shown)).join('')};`); used.add('restore'); }
        targets.push({ expr: v, answers: as }); used.add('reset'); continue;
      }
      if (a0.kind === 'random') { before.push(`${D}.spyOn(Math, 'random')${as.map((a) => onceOf(a.shown)).join('')};`); targets.push({ expr: 'Math.random', answers: as }); used.add('restore'); continue; }
      if (a0.kind === 'clock') {
        if (new Set(as.map((a) => a.shown.returns)).size === 1) { before.push(`${D}.useFakeTimers(${D === 'vi' ? "{ toFake: ['Date'] }" : ''});`, `${D}.setSystemTime(${as[0].shown.returns});`); used.add('timers'); }
        else { before.push(`${D}.spyOn(Date, 'now')${as.map((a) => onceOf(a.shown)).join('')};`); used.add('restore'); }
      }
    }
    out.cases.set(c, { before, targets, restore });
  }
  if (!plain && used.size) {
    const undo = [...(used.has('reset') ? [`${D}.resetAllMocks();`] : []), ...(used.has('restore') ? [`${D}.restoreAllMocks();`] : []), ...(used.has('globals') ? ['vi.unstubAllGlobals();'] : []), ...(used.has('timers') ? [`${D}.useRealTimers();`] : [])];
    out.hooks.push(`afterEach(() => { ${undo.join(' ')} });`);
  }
  return out;
}

// the requests the case made, asserted after its outcome: how many times each stub was called and, where the arguments
// print as values, with what. LEAN_BREAK=new-test-calls: no request is asserted
export function callsOf(stub, dialect) {
  if (broken('new-test-calls') || !stub) return { lines: [], calls: 0 };
  const lines = []; let calls = 0;
  for (const t of stub.targets) {
    const args = t.answers.map((a) => a.args);
    const printable = args.every((xs) => xs.every((x) => stubPrintable(x)));
    if (t.plain) {
      if (printable) { lines.push(`    assert.deepStrictEqual(${t.plain}.calls, [${args.map((xs) => `[${xs.map((x) => toSource(x)).join(', ')}]`).join(', ')}]);`); calls += args.length; }
      else { lines.push(`    assert.strictEqual(${t.plain}.calls.length, ${args.length});`); calls++; }
      continue;
    }
    lines.push(`    expect(${t.expr}).toHaveBeenCalledTimes(${args.length});`); calls++;
    if (printable && t.answers[0].kind !== 'random') args.forEach((xs, k) => { lines.push(`    expect(${t.expr}).toHaveBeenNthCalledWith(${k + 1}${xs.map((x) => `, ${toSource(x)}`).join('')});`); calls++; });
  }
  return { lines, calls };
}

// ----- the text: one `it` per kept case, in the runner's dialect -----
const DIALECT = {
  vitest: { head: "import { describe, it, expect } from 'vitest';", style: 'expect' },
  jest: { head: "import { describe, it, expect } from '@jest/globals';", style: 'expect' },
  'node:test': { head: "import { describe, it } from 'node:test';\nimport assert from 'node:assert/strict';", style: 'assert' },
  mocha: { head: "import assert from 'node:assert/strict';", style: 'assert' }, // describe and it are mocha's globals
};
const short = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function testText({ unit, binding, defaultExport, importFrom, dialect, cases, isAsync, stubs = null }) {
  const d = DIALECT[dialect] ?? DIALECT.vitest;
  const world = stubs && (stubs.hoisted.length || stubs.hooks.length || [...stubs.cases.values()].some((x) => x.before.length)); // (lane w9al) the runner's mock API joins the head
  const head = world && d.style === 'expect' ? d.head.replace('{ describe, it, expect }', `{ describe, it, expect, ${dialect === 'jest' ? 'jest' : 'vi'}${stubs.hooks.length ? ', afterEach' : ''} }`) : d.head;
  const lines = [head, ...(stubs?.imports ?? []), defaultExport ? `import ${binding} from '${importFrom}';` : `import { ${binding} } from '${importFrom}';`, ...(stubs?.hoisted.length ? ['', ...stubs.hoisted] : []), '', `describe(${JSON.stringify(unit)}, () => {`, ...(stubs?.hooks ?? []).map((h) => `  ${h}`)];
  const callOf = (c) => `${binding}(${(c.argsShown ?? c.args).map((a) => toSource(a, c.shared)).join(', ')})`; // (lane w9al) an input handle by its stub's name
  const seen = new Map();
  for (const c of cases) {
    c.shared = { defs: [] };
    const call = callOf(c), threw = Object.hasOwn(c.outcome, 'threw');
    const err = threw ? c.outcome.threw : null, message = err && typeof err === 'object' ? String(err.message ?? '') : String(err ?? '');
    let name = threw ? `${short(call, 60)} throws` : `${short(call, 60)} -> ${short(toSource(c.outcome.returned, { defs: [] }), 40)}`;
    const k = (seen.get(name) ?? 0) + 1; seen.set(name, k); if (k > 1) name += ` (${k})`;
    const body = [];
    const stub = stubs?.cases.get(c) ?? null; // (lane w9al) the case's stubs before its call
    for (const line of stub?.before ?? []) body.push(`    ${line}`);
    for (const def of c.shared.defs) body.push(`    ${def}`);
    if (d.style === 'expect') {
      if (threw) body.push(isAsync ? `    await expect(${call}).rejects.toThrow(${JSON.stringify(message)});` : `    expect(() => ${call}).toThrow(${JSON.stringify(message)});`);
      else { const m = holdsUndefined(c.outcome.returned) ? 'toStrictEqual' : 'toEqual'; body.push(isAsync ? `    await expect(${call}).resolves.${m}(${toSource(c.outcome.returned, c.shared)});` : `    expect(${call}).${m}(${toSource(c.outcome.returned, c.shared)});`); }
    } else {
      if (threw) body.push(isAsync ? `    await assert.rejects(${call}, { message: ${JSON.stringify(message)} });` : `    assert.throws(() => ${call}, { message: ${JSON.stringify(message)} });`);
      else body.push(`    assert.deepStrictEqual(${isAsync ? `await ${call}` : call}, ${toSource(c.outcome.returned, c.shared)});`);
    }
    const calls = callsOf(stub, dialect); body.push(...calls.lines); if (stubs) stubs.calls = (stubs.calls ?? 0) + calls.calls; // (lane w9al) the requests it made
    if (stub?.restore.length) { const k = body.findIndex((l) => !(stub.before.includes(l.trim()))); const set = body.slice(0, k), rest = body.slice(k); body.length = 0; body.push(...set, '    try {', ...rest.map((l) => `  ${l}`), `    } finally { ${stub.restore.join(' ')} }`); }
    lines.push(`  it(${JSON.stringify(name)}, ${isAsync ? 'async ' : ''}() => {`, ...body, '  });');
  }
  lines.push('});', '');
  return lines.join('\n');
}

// ----- the mutants: one edit per site of the unit (mutate.mjs), each compiled from its text beside the candidate, each
// case replayed against it from the same seed (as the parameter trials replay a base); a mutant is killed when the case's
// outcome differs, when the mutant asks the world where the unit did not, or when it runs out of its bound. Each mutant
// stops at its first killer. No type check of a mutant here (a child under the permission model writes no file; the
// bench's planted mutants are type-checked at their making). LEAN_BREAK=new-test-mutants: no mutant planted
async function killsOf({ candidate, unit, spec, cases, seed, ms, load, project, now = Date.now }) {
  if (broken('new-test-mutants') || !load) return null;
  let sites; try { sites = sitesOf(candidate, unit, { project: project ?? false, hard: false }).sites; } catch (e) { return { error: `the mutation sites could not be read: ${String(e?.message ?? e).slice(0, 160)}` }; }
  const order = [], seenKind = new Set();
  sites.forEach((s, k) => { if (!seenKind.has(s.kind)) { seenKind.add(s.kind); order.push(k); } });
  sites.forEach((s, k) => { if (!order.includes(k) && order.length < MUTANTS) order.push(k); });
  const ext = path.extname(candidate) || '.ts', dir = path.dirname(path.resolve(candidate));
  const planted = [], t0 = now();
  let budget = null;
  for (const k of order.slice(0, MUTANTS)) {
    if (now() - t0 > KILL_MS) { budget = `stopped after ${planted.length} of ${Math.min(order.length, MUTANTS)} mutants at ${KILL_MS / 1000} s`; break; }
    const m = mutate(candidate, unit, k, { project: project ?? false, typecheck: false });
    if (!m) continue;
    const virtual = path.join(dir, `.lean_mutant_${process.pid}_${unit.replace(/[^\w$]+/g, '_')}_${k}${ext}`);
    setVirtual(virtual, m.source);
    const entry = { k, kind: m.site.kind, lines: m.site.lines, was: String(m.site.was ?? '').slice(0, 40), killer: null };
    for (const c of cases) {
      const env = new Environment(seed * 7919 + c.i); env.shapes = spec;
      let loaded; try { loaded = await load(virtual, env, {}); } catch (e) { entry.load = String(e?.message ?? e).slice(0, 120); break; }
      const picked = pickUnit(loaded.exports, spec, env); if (!picked) { entry.load = 'unit not callable'; break; }
      await new Promise((r) => setImmediate(r)); env.trace.length = 0; env.pending.length = 0; env.calls.clear();
      const drawn = inputsFor(spec, seed, c.i, env); const inputs = c.step ? edgeInput(drawn, c.step) : drawn;
      env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
      let o; try { o = await observe({ env, unit: picked }, spec, inputs, ms); } catch (e) { entry.killer = c.i; entry.how = `the run failed: ${String(e?.message ?? e).slice(0, 80)}`; break; }
      if (o.harness) { entry.killer = c.i; entry.how = 'out of its bound'; break; }
      const out = Object.hasOwn(o.outcome, 'threw') ? { threw: render(o.raw?.threw) } : { returned: render(o.raw?.returned) };
      const was = Object.hasOwn(c.outcome, 'threw') ? { threw: c.outcome.threw } : { returned: c.outcome.returned };
      if (JSON.stringify(out) !== JSON.stringify(was)) { entry.killer = c.i; entry.how = 'a different outcome'; break; }
      const asked = JSON.stringify(o.trace.map(({ op, path: p, args }) => ({ op, path: p, args }))), was2 = JSON.stringify(c.world?.trace ?? []); // (lane w9al) a case that asked the world kills a mutant that asks it otherwise
      if (asked !== was2) { entry.killer = c.i; entry.how = c.world ? 'other requests of the world' : 'asked the world'; break; }
    }
    planted.push(entry);
  }
  return { planted, ...(budget ? { budget } : {}) };
}

// ----- the cases kept: the ones that complete a statement no kept case completed, then one per distinct outcome -----
export function selectCases(usable, statements, kills = null) {
  const kept = [], have = new Set();
  const byIndex = new Map(usable.map((c) => [c.i, c]));
  const add = (c) => { if (c && !kept.includes(c) && kept.length < CASES) { kept.push(c); for (const t of c.reached ?? []) have.add(t); } };
  for (const c of usable) if ((c.reached ?? []).some((t) => !have.has(t))) add(c); // the statements, each by the first case completing it
  for (const m of kills?.planted ?? []) if (m.killer !== null) add(byIndex.get(m.killer)); // each killed mutant by its first killer
  // one case per distinct error: its class and its message with the case's own strings and every number templated
  const errorKey = (c) => { const e = c.outcome.threw; let m = e && typeof e === 'object' ? String(e.message ?? '') : String(e ?? ''); for (const a of c.args) if (typeof a === 'string' && a.length) m = m.split(a).join('<q>'); return `${e && typeof e === 'object' ? e.$error ?? '' : typeof e}:${m.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '<q>').replace(/-?\d+(?:\.\d+)?/g, '<n>')}`; };
  const errors = new Set(kept.filter((c) => Object.hasOwn(c.outcome, 'threw')).map(errorKey));
  let extra = 0;
  for (const c of usable) { if (!Object.hasOwn(c.outcome, 'threw') || extra >= 3) continue; const e = errorKey(c); if (!errors.has(e)) { errors.add(e); add(c); extra++; } }
  if (!kept.length && usable.length) add(usable[0]);
  return kept.sort((a, b) => a.i - b.i);
}

// the mutants as the record carries them: planted, killed, per kind, and the loads or bounds that stopped a mutant
function mutantsOf(kills) {
  if (!kills) return null;
  if (kills.error) return { error: kills.error };
  const kinds = {};
  for (const m of kills.planted) { const e = (kinds[m.kind] ??= { planted: 0, killed: 0 }); e.planted++; if (m.killer !== null) e.killed++; }
  return { planted: kills.planted.length, killed: kills.planted.filter((m) => m.killer !== null).length, kinds, typechecked: false, ...(kills.budget ? { budget: kills.budget } : {}), sites: kills.planted.map((m) => ({ kind: m.kind, lines: m.lines, was: m.was, ...(m.killer !== null ? { killer: m.killer, how: m.how } : {}), ...(m.load ? { load: m.load } : {}) })) };
}

// (lane w9al) the specifiers the candidate's file imports, each with the names it imports from it (a package mock holds them all)
function importsOf(candidate) {
  const out = new Map();
  let sf; try { sf = ts.createSourceFile(candidate, fs.readFileSync(candidate, 'utf8'), ts.ScriptTarget.Latest, true); } catch { return out; }
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || st.importClause?.isTypeOnly) continue;
    const names = out.get(st.moduleSpecifier.text) ?? new Set(); out.set(st.moduleSpecifier.text, names);
    const nb = st.importClause?.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if (!el.isTypeOnly) names.add((el.propertyName ?? el.name).text);
  }
  return out;
}

export async function writeNewTest({ candidate, unit, spec, cases = [], statements = null, lines = null, seed = 1, ms = 2000, options, load, project, specifiers = [] }) {
  const listed = statements ?? [];
  const reachedAny = new Set(cases.flatMap((c) => c.reached ?? []));
  const { runner, dir } = runnerOf(candidate);
  const dialect = runner ?? 'vitest';
  // a case is usable when its arguments and outcome print as values, it hands out no function, and every request it made of
  // the world is one a stub answers with what lean answered (lane w9al: worldOf); the first refusal is kept for the reason
  const imported = importsOf(candidate), refusals = [];
  const usable = cases.filter((c) => {
    const handles = broken('new-test-world') ? (holdsWorld(c.args) ? null : []) : inputHandles(c.args); // (lane w9al) an argument lean answers member by member is an input stub
    if (c.drives || handles === null || holdsWorld(c.outcome.returned ?? c.outcome.threw)) return false;
    const w = worldOf(c, { specifiers: [...new Set([...specifiers, ...imported.keys()])], dialect, handles });
    if (w.refused) { refusals.push(w.refused); return false; }
    c.worldAnswers = w.answers; return true;
  });
  const closed = cases.filter((c) => !c.world).length, asked = cases.length - closed; // (lane w9al) a call that drew from the world (a request, Math.random) is no closed call
  const cover = (reason, extra = {}) => ({ kind: 'new:coverage', phase: 'test', reason, ...extra });
  if (!usable.length) {
    const why = refusals.length ? ` (needs a stub of a surface no test stubs: ${[...new Set(refusals)].slice(0, 2).join('; ').slice(0, 240)})` : '';
    return cover(asked ? `${cases.length} call(s), ${asked} of them asking lean's world, none a test can restate: each holds a value of lean's world, hands out a function, or asks the world where no stub answers${why}` : cases.length ? `${cases.length} closed call(s), none a test can restate by value: each holds a value of lean's world or hands out a function (needs a stub)` : 'no closed call of the unit: every drawn input reached the world or was not admitted by the declared types', refusals.length ? { surfaces: [...new Set(refusals)].slice(0, 4) } : {});
  }
  // the unit as the repository's runner imports it: a top-level binding the module exports under its own name, or its default
  const exported = spec?.exported ?? null, binding = unit.includes('.') ? null : unit;
  if (!binding) return cover(`the unit ${unit} is a member (a class method or a property): the runner cannot call it by name (needs a stub)`);
  if (exported === false) return cover(`the unit ${unit} is not exported: the repository's runner cannot import it (needs a stub)`);
  const place = placeOf(candidate, unit, runner);
  const kills = await killsOf({ candidate, unit, spec, cases: usable, seed, ms, load, project });
  const kept = selectCases(usable, listed, kills);
  const reached = new Set(kept.flatMap((c) => c.reached ?? []));
  const missed = listed.filter((t) => !reached.has(t)), unreached = listed.filter((t) => !reachedAny.has(t));
  const isAsync = kept.some((c) => c.thenable) || !!spec?.isAsync;
  let text, stubs;
  try { stubs = stubsOf(kept, dialect, imported); text = testText({ unit, binding, defaultExport: exported === 'default', importFrom: place.importFrom, dialect, cases: kept, isAsync, stubs }); }
  catch (e) { return cover(`no source for a case: ${String(e?.message ?? e).slice(0, 160)}`); }
  const at = (t) => lines?.[t] ?? t;
  const record = { kind: 'new:proposed-test', unit, file: path.relative(dir, place.file), runner: runner ?? 'unknown (vitest dialect)', dialect, cases: kept.length, closed, usable: usable.length, statements: { listed: listed.length, reached: reached.size, missed: missed.map(at), unreached: unreached.map(at) }, mutants: mutantsOf(kills),
    world: { asked, stubs: stubs.stubs, calls: stubs.calls ?? 0, surfaces: [...stubs.surfaces].sort(), ...(refusals.length ? { refused: [...new Set(refusals)].slice(0, 4) } : {}) }, text };
  if (missed.length) return cover(`a test from the closed calls completes ${reached.size} of ${listed.length} statements of the unit (missed: lines ${missed.map(at).join(', ')}): below the bar, no test proposed`, { statements: record.statements, cases: kept.length });
  // the self-check: the text runs under lean's runner model against the candidate; every case passes, the run asks nothing of the world
  if (!broken('new-test-check') && load) {
    const virtual = path.join(path.dirname(path.resolve(candidate)), `.lean_test_${process.pid}_${unit.replace(/[^\w$]+/g, '_')}.test${path.extname(candidate) || '.ts'}`);
    const textAt = text.replace(`'${place.importFrom}'`, `'./${path.basename(candidate, path.extname(candidate))}'`);
    const r = await runTests({ candidate: path.resolve(candidate), unit, testFiles: [virtual], texts: new Map([[virtual, textAt]]), ms, seed, load, graphWorld: () => [], options, mocks: true }); // (lane w9al) the test's own stubs run as the runner runs them
    const s = r.summary, bad = r.records.filter((x) => x.kind !== 'new:coverage' || x.phase !== 'test' || !/does not import/.test(String(x.reason)));
    record.check = { files: s.files, selected: s.selected, passed: s.passed, failed: s.failed, world: s.world, notModelled: s.notModelled, unsettled: s.unsettled };
    if (s.selected !== kept.length || s.passed !== kept.length) return cover(`the test does not pass under lean's runner model on the candidate (selected ${s.selected}, passed ${s.passed}, failed ${s.failed}, world ${s.world}, not modelled ${s.notModelled}, unsettled ${s.unsettled}; ${bad.map((x) => x.reason ?? x.error?.assertion ?? x.error?.message ?? '').filter(Boolean).slice(0, 2).join('; ').slice(0, 200)})`, { statements: record.statements, cases: kept.length });
  }
  return record;
}
