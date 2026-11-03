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
import { edgeInput, member } from './declared.mjs';
import { HANDED_CALL } from './spec.mjs';
import { pickUnit, observe } from './run.mjs';
import { Environment, render } from './fake.mjs';
import { sitesOf, mutate } from './mutate.mjs';
import { setVirtual, callbackCalls, handedDraws, requestsOf } from './new-unit.mjs';

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
  if (shared?.spies && typeof v.$fake === 'string' && shared.spies.has(v.$fake)) return shared.spies.get(v.$fake); // (lane w9am) a callback lean drew: the test's spy for it
  if (shared?.fnAs && typeof v.$fn === 'string' && /^#\d+$/.test(v.$fn)) return shared.fnAs; // (lane w9am) a function the unit handed out, asserted a function (its calls are asserted after)
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

// ----- the text: one `it` per kept case, in the runner's dialect -----
const DIALECT = {
  vitest: { head: "import { describe, it, expect } from 'vitest';", style: 'expect' },
  jest: { head: "import { describe, it, expect } from '@jest/globals';", style: 'expect' },
  'node:test': { head: "import { describe, it } from 'node:test';\nimport assert from 'node:assert/strict';", style: 'assert' },
  mocha: { head: "import assert from 'node:assert/strict';", style: 'assert' }, // describe and it are mocha's globals
};
const SPY = { vitest: { from: '{ describe, it, expect }', to: '{ describe, it, expect, vi }' }, jest: { from: '{ describe, it, expect }', to: '{ describe, it, expect, jest }' } };
const short = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function testText({ unit, binding, defaultExport, importFrom, dialect, cases, isAsync }) {
  const d = DIALECT[dialect] ?? DIALECT.vitest;
  const head = cases.some((c) => c.handed?.spies) && SPY[dialect] ? d.head.replace(SPY[dialect].from, SPY[dialect].to) : d.head; // (lane w9am) a spy's own import
  const lines = [head, defaultExport ? `import ${binding} from '${importFrom}';` : `import { ${binding} } from '${importFrom}';`, '', `describe(${JSON.stringify(unit)}, () => {`];
  const callOf = (c) => `${binding}(${c.args.map((a) => toSource(a, c.shared)).join(', ')})`;
  const seen = new Map();
  const nameOf = (name) => { const k = (seen.get(name) ?? 0) + 1; seen.set(name, k); return k > 1 ? `${name} (${k})` : name; };
  for (const c of cases) {
    if (c.handed) { lines.push(`  it(${JSON.stringify(nameOf(c.handed.name))}, ${isAsync || c.handed.async ? 'async ' : ''}() => {`, ...c.handed.body.map((l) => `    ${l}`), '  });'); continue; } // (lane w9am) handedBody
    c.shared = { defs: [] };
    const call = callOf(c), threw = Object.hasOwn(c.outcome, 'threw');
    const err = threw ? c.outcome.threw : null, message = err && typeof err === 'object' ? String(err.message ?? '') : String(err ?? '');
    const name = nameOf(threw ? `${short(call, 60)} throws` : `${short(call, 60)} -> ${short(toSource(c.outcome.returned, { defs: [] }), 40)}`);
    const body = [];
    for (const def of c.shared.defs) body.push(`    ${def}`);
    if (d.style === 'expect') {
      if (threw) body.push(isAsync ? `    await expect(${call}).rejects.toThrow(${JSON.stringify(message)});` : `    expect(() => ${call}).toThrow(${JSON.stringify(message)});`);
      else { const m = holdsUndefined(c.outcome.returned) ? 'toStrictEqual' : 'toEqual'; body.push(isAsync ? `    await expect(${call}).resolves.${m}(${toSource(c.outcome.returned, c.shared)});` : `    expect(${call}).${m}(${toSource(c.outcome.returned, c.shared)});`); }
    } else {
      if (threw) body.push(isAsync ? `    await assert.rejects(${call}, { message: ${JSON.stringify(message)} });` : `    assert.throws(() => ${call}, { message: ${JSON.stringify(message)} });`);
      else body.push(`    assert.deepStrictEqual(${isAsync ? `await ${call}` : call}, ${toSource(c.outcome.returned, c.shared)});`);
    }
    lines.push(`  it(${JSON.stringify(name)}, ${isAsync ? 'async ' : ''}() => {`, ...body, '  });');
  }
  lines.push('});', '');
  return lines.join('\n');
}

// ----- (lane w9am, design/w9am-handed-functions.md) a case whose call handed out a function, or was handed a callback -----
// A function the unit handed out (a closure it returned, a method of an object it returned) lean drove after the call
// (run.mjs driveOne): on drawn arguments, then again on others, then with trailing optional arguments left out, each
// drive in turn on the state the earlier ones left. The test does the same, in the same order: it binds what the unit
// returned, reaches each handed-out function by its path in that value (or in what an earlier drive returned), calls
// it on the arguments its formal parameters see (new-unit.mjs formalsOf) and asserts what lean saw it return or throw.
// A callback lean drew (a fake whose calls are the call's only requests, new-unit.mjs callbackCalls) is a spy that
// answers what lean's fake answered, in call order; the test asserts the calls lean recorded (their count, their
// arguments). A case the test cannot restate by value stays out, with why (the record's refusal reason counts them).
// LEAN_BREAK=new-test-drives: a case whose call handed out a function stays out (the writer before lane w9am)
const handled = (v) => !!v && typeof v === 'object' && typeof v.$fn === 'string' && /^#\d+$/.test(v.$fn);
const ident = (k) => /^[A-Za-z_$][\w$]*$/.test(k);
const access = (base, keys) => keys.reduce((e, k) => (typeof k === 'number' ? `${e}[${k}]` : ident(k) ? `${e}.${k}` : `${e}[${JSON.stringify(k)}]`), base);
// the handles a rendered value holds, each by the first path that reaches it (plain objects and arrays only)
function handlesIn(v, at = [], out = new Map(), depth = 0) {
  if (!v || typeof v !== 'object' || depth > 12) return out;
  if (handled(v)) { if (!out.has(v.$fn)) out.set(v.$fn, at); return out; }
  if (Array.isArray(v)) v.forEach((x, i) => handlesIn(x, [...at, i], out, depth + 1));
  else if (Object.hasOwn(v, '$ref') && Object.hasOwn(v, 'value')) handlesIn(v.value, at, out, depth + 1);
  else if (!Object.keys(v).some((k) => k.startsWith('$'))) for (const [k, x] of Object.entries(v)) handlesIn(x, [...at, k], out, depth + 1);
  return out;
}
// a rendered value with the handles (and the callbacks the test spies on) taken out: what is left must print by value
const withoutHandles = (v, spies = null, depth = 0) => (!v || typeof v !== 'object' || depth > 12 ? v : handled(v) || (spies && typeof v.$fake === 'string' && spies.has(v.$fake)) ? null : Array.isArray(v) ? v.map((x) => withoutHandles(x, spies, depth + 1)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withoutHandles(x, spies, depth + 1)])));
const anyHandle = (v) => JSON.stringify(v ?? null).includes('"$fn":"#');
const refuse = (why, detail) => Object.assign(new Error(detail), { why });
const WHY = {
  world: 'a call whose arguments or outcome hold a value of lean\'s world',
  driveWorld: 'a handed-out function whose outcome holds a value of the world',
  driveShape: 'a handed-out function lean could not drive to the end, a class, an iterator or a hook',
  unreached: 'a handed-out function the test reaches by no path from what the unit returned',
  thrownHandle: 'a thrown value that holds a function',
  driveOff: 'a call that hands out a function (LEAN_BREAK=new-test-drives: the writer keeps none)',
  driveType: 'a handed-out function lean drove on arguments its declared parameter types do not admit',
};
// a value that prints (toSource) as the value it stands for, so the declared types can judge it (declared.mjs member);
// undefined-valued `fail` when it holds what no test prints
const FAIL = Symbol('no value');
function fromRendered(v, depth = 0) {
  if (v === null || typeof v !== 'object') return v;
  if (depth > 12) return FAIL;
  if (Array.isArray(v)) { const out = v.map((x) => fromRendered(x, depth + 1)); return out.includes(FAIL) ? FAIL : out; }
  if (Object.hasOwn(v, '$undefined')) return undefined;
  if (Object.hasOwn(v, '$nan')) return NaN;
  if (Object.hasOwn(v, '$negativeZero')) return -0;
  if (Object.hasOwn(v, '$infinity')) return v.$infinity < 0 ? -Infinity : Infinity;
  if (Object.hasOwn(v, '$bigint')) { try { return BigInt(v.$bigint); } catch { return FAIL; } }
  if (Object.hasOwn(v, '$date')) return new Date(v.$date === 'invalid' ? NaN : v.$date);
  if (Object.hasOwn(v, '$ref')) return Object.hasOwn(v, 'value') ? fromRendered(v.value, depth + 1) : FAIL;
  if (Object.keys(v).some((k) => k.startsWith('$'))) return FAIL; // a map, a set, a regex, an error, a value of the world: the declared types judge none of them here
  const out = {}; for (const [k, x] of Object.entries(v)) { const y = fromRendered(x, depth + 1); if (y === FAIL) return FAIL; out[k] = y; }
  return out;
}
// whether a drive's arguments are ones the handed-out function's declared parameters admit (spec.mjs handedParams): the
// test calls it as the declared type lets a caller call it (every argument 'yes', a left-out one optional), so the test
// file type-checks where the unit's declaration does; lean's drawn arguments are drawn from the unit's pools, not its types
function driveAdmitted(params, args, defs, nullable) {
  if (!params) return false;
  const restAt = params.findIndex((p) => p.rest);
  if (restAt < 0 && args.length > params.length) return false;
  const opts = { nullable, side: 'input' };
  for (let k = 0; k < Math.max(args.length, restAt < 0 ? params.length : restAt); k++) {
    const p = restAt >= 0 && k >= restAt ? params[restAt] : params[k];
    if (k >= args.length) { if (!p.optional && !p.rest) return false; continue; }
    const v = fromRendered(args[k]); if (v === FAIL) return false;
    if (p.optional && v === undefined) continue;
    const s = p.rest ? (p.spec.kind === 'array' ? p.spec.of : p.spec.kind === 'tuple' ? p.spec.items[k - restAt] : null) : p.spec;
    if (!s || member(s, v, defs, opts) !== 'yes') return false;
  }
  return true;
}
const errorText = (e) => (e && typeof e === 'object' ? String(e.message ?? '') : String(e ?? ''));
// the lines of one handed case, in the dialect; throws `refuse(why)` when the case is one the test cannot restate
export function handedBody(c, { binding, dialect, isAsync, handedParams = null, defs = {}, nullable = false, paramNames = [], typed = false }) {
  const expectStyle = (DIALECT[dialect] ?? DIALECT.vitest).style === 'expect';
  const shared = { defs: [], spies: new Map(), fnAs: expectStyle ? 'expect.any(Function)' : null };
  const src = (v, why = 'world') => { if (holdsWorld(withoutHandles(v, shared.spies))) throw refuse(why, 'a value of the world'); try { return toSource(v, shared); } catch (e) { throw refuse(why, e.message); } };
  const used = new Set([binding, 'out']), pre = [], post = [], body = [];
  let async = !!isAsync, calls = 0;
  for (const cb of c.callbacks ?? []) { // a spy per callback, named after the parameter lean drew it for
    const top = /^arg(\d+)#fn$/.exec(cb.path); // a parameter of the unit's own: its declared name
    let base = top && paramNames[Number(top[1])] && ident(paramNames[Number(top[1])]) ? paramNames[Number(top[1])] : (cb.path.replace(/#fn$/, '').split(/[^\w$]+/).filter(Boolean).pop() ?? 'fn'); if (!/^[A-Za-z_$]/.test(base)) base = `fn${base}`;
    let name = base; for (let j = 2; used.has(name) || used.has(`${name}Calls`); j++) name = `${base}${j}`;
    used.add(name); used.add(`${name}Calls`); shared.spies.set(cb.path, name);
  }
  for (const cb of c.callbacks ?? []) {
    const name = shared.spies.get(cb.path), answers = cb.calls.map((x) => src(x.returned)), argsOf = (x) => x.args.map((a) => src(a));
    if (expectStyle) {
      pre.push(`const ${name} = ${dialect === 'jest' ? 'jest' : 'vi'}.fn()${answers.map((a) => `.mockReturnValueOnce(${a})`).join('')};`);
      post.push(`expect(${name}).toHaveBeenCalledTimes(${cb.calls.length});`, ...cb.calls.map((x, j) => `expect(${name}).toHaveBeenNthCalledWith(${[j + 1, ...argsOf(x)].join(', ')});`));
    } else {
      const t = typed ? ': unknown[]' : ''; // a TypeScript test under noImplicitAny
      pre.push(`const ${name}Calls${typed ? ': unknown[][]' : ''} = [];`, `const ${name} = (...args${t})${typed && !answers.length ? ': any' : ''} => { ${name}Calls.push(args);${answers.length ? ` return [${answers.join(', ')}][${name}Calls.length - 1];` : ''} };`); // a spy never called answers nothing: in TypeScript it stands for any callback type
      post.push(`assert.deepStrictEqual(${name}Calls, [${cb.calls.map((x) => `[${argsOf(x).join(', ')}]`).join(', ')}]);`);
    }
  }
  const assertParts = (expr, v, out) => { // the node:assert form of a value that holds functions: each part at its path
    if (!anyHandle(v)) { out.push(`assert.deepStrictEqual(${expr}, ${src(v)});`); return; }
    if (handled(v)) { out.push(`assert.strictEqual(typeof ${expr}, 'function');`); return; }
    if (Array.isArray(v)) { out.push(`assert.strictEqual(${expr}.length, ${v.length});`); v.forEach((x, i) => assertParts(`${expr}[${i}]`, x, out)); return; }
    if (v && typeof v === 'object' && !Object.keys(v).some((k) => k.startsWith('$'))) { out.push(`assert.deepStrictEqual(Object.keys(${expr}).sort(), ${JSON.stringify(Object.keys(v).sort())});`); for (const [k, x] of Object.entries(v)) assertParts(access(expr, [k]), x, out); return; }
    throw refuse('unreached', 'a function inside a value no path reads');
  };
  const assertValue = (expr, v) => {
    if (!expectStyle) { const out = []; assertParts(expr, v, out); return out; }
    if (v && typeof v === 'object' && Object.hasOwn(v, '$undefined')) return [`expect(${expr}).toBeUndefined();`];
    return [`expect(${expr}).${holdsUndefined(v) ? 'toStrictEqual' : 'toEqual'}(${src(v)});`];
  };
  const assertThrow = (ex, err, awaited) => { const m = JSON.stringify(errorText(err)); if (awaited) async = true; return expectStyle ? (awaited ? `await expect((async () => ${ex})()).rejects.toThrow(${m});` : `expect(() => ${ex}).toThrow(${m});`) : (awaited ? `await assert.rejects(async () => ${ex}, { message: ${m} });` : `assert.throws(() => ${ex}, { message: ${m} });`); };
  const call = `${binding}(${c.args.map((a) => src(a)).join(', ')})`;
  body.push(...pre);
  if (Object.hasOwn(c.outcome, 'threw')) {
    if (c.drives.length || anyHandle(c.outcome.threw)) throw refuse('thrownHandle', 'a thrown value that holds a function');
    body.push(assertThrow(call, c.outcome.threw, isAsync));
  } else if (!c.drives.length && !anyHandle(c.outcome.returned)) {
    body.push(...assertValue(isAsync ? `await ${call}` : call, c.outcome.returned));
  } else {
    body.push(`const out = ${isAsync ? 'await ' : ''}${call};`, ...assertValue('out', c.outcome.returned));
    const where = new Map([...handlesIn(c.outcome.returned)].map(([h, at]) => [h, { expr: access('out', at), route: at }]));
    let r = 0;
    for (const dv of c.drives) {
      if (dv.undriven || dv.constructed !== undefined || dv.methods || dv.steps || dv.slots || (dv.again ?? []).some((x) => x.steps) || (dv.omitted ?? []).some((x) => x.steps)) throw refuse('driveShape', `drive ${dv.$fn}: ${dv.undriven ?? 'a class, an iterator or a hook'}`);
      const spiedOnly = (tr) => (tr ?? []).every((t) => t.op === 'call' && shared.spies.has(t.path)); // a call of a callback the test spies on is the spy's (asserted after)
      if (!spiedOnly(dv.trace) || dv.pending || (dv.omitted ?? []).some((x) => !spiedOnly(x.trace))) throw refuse('driveWorld', `drive ${dv.$fn} asked the world`);
      const at = where.get(dv.$fn); if (!at) throw refuse('unreached', `drive ${dv.$fn}`);
      const callee = at.expr, params = broken('new-test-drive-types') ? 'any' : handedParams ? handedParams(at.route) : null;
      const cut = (a) => (dv.formals === null || dv.formals === undefined ? a : a.slice(0, dv.formals));
      const forms = [{ args: cut(dv.args), out: dv }, ...(dv.again ?? []).map((x) => ({ args: cut(x.args), out: x })), ...(dv.omitted ?? []).map((x) => ({ args: x.undefinedAt !== undefined ? [...dv.args.slice(0, x.undefinedAt), { $undefined: true }] : dv.args.slice(0, x.args), out: x }))];
      for (const f of forms) {
        calls++;
        if (holdsWorld(withoutHandles(f.args, shared.spies))) throw refuse('driveWorld', `drive ${dv.$fn}: an argument of lean's world`); // a drawn fake: the world's reason before the type's
        if (params !== 'any' && !driveAdmitted(params, f.args, defs, nullable)) throw refuse('driveType', `drive ${dv.$fn}: arguments the declared parameters do not admit`);
        const ex = `${callee}(${f.args.map((a) => src(a, 'driveWorld')).join(', ')})`, awaited = !!(dv.async || f.out.promise);
        if (Object.hasOwn(f.out, 'threw')) { if (anyHandle(f.out.threw)) throw refuse('thrownHandle', 'a drive threw a function'); body.push(assertThrow(ex, f.out.threw, awaited)); continue; }
        if (awaited) async = true;
        const fresh = [...handlesIn(f.out.returned)].filter(([h]) => !where.has(h));
        const v = f.out.returned; if (holdsWorld(withoutHandles(v, shared.spies))) throw refuse('driveWorld', `drive ${dv.$fn} returned a value of the world`);
        if (fresh.length) { const name = `r${++r}`; body.push(`const ${name} = ${awaited ? 'await ' : ''}${ex};`, ...assertValue(name, v)); for (const [h, p] of fresh) where.set(h, { expr: access(name, p), route: [...at.route, HANDED_CALL, ...p] }); }
        else body.push(...assertValue(`${awaited ? 'await ' : ''}${ex}`, v));
      }
    }
  }
  body.push(...post);
  return { body: [...shared.defs, ...body], name: c.drives.length ? `${short(call, 60)} hands out ${c.drives.length} function(s), called ${calls} time(s)` : `${short(call, 60)} with ${(c.callbacks ?? []).map((x) => `${shared.spies.get(x.path)} called ${x.calls.length} time(s)`).join(', ')}`, async, spies: !!c.callbacks?.length, calls, callbackCalls: (c.callbacks ?? []).reduce((n, x) => n + x.calls.length, 0) };
}
// a case the test restates: a plain one (its arguments and outcome print as values), or a handed one with its body
function usableCase(c, opts) {
  const plain = !c.drives?.length && !c.callbacks?.length && !holdsWorld(c.args) && !holdsWorld(c.outcome.returned ?? c.outcome.threw);
  if (plain) return { ok: true };
  if (!c.drives?.length && !c.callbacks?.length) return { why: 'world' };
  if (broken('new-test-drives') && c.drives?.length) return { why: 'driveOff' };
  const spied = new Set((c.callbacks ?? []).map((x) => x.path)); // a drive that asked the world beyond a spied callback's calls: the drive's reason comes first
  if ((c.drives ?? []).some((d) => d.pending || [...(d.trace ?? []), ...(d.omitted ?? []).flatMap((x) => x.trace ?? [])].some((t) => !(t.op === 'call' && spied.has(t.path))))) return { why: 'driveWorld' };
  try { c.handed = handedBody(c, opts); return { ok: true }; } catch (e) { if (e.why) return { why: e.why }; throw e; }
}
// a drive as a mutant's replay compares it: what each call returned or threw and whether it asked the world
const outOf = (x) => ({ ...(Object.hasOwn(x, 'threw') ? { threw: x.threw } : { returned: x.returned }), ...(x.promise ? { promise: true } : {}), ...(x.steps ? { steps: x.steps } : {}) });
const driveView = (ds) => (ds ?? []).map((d) => ({ fn: d.$fn, args: d.args, undriven: d.undriven ?? null, ...(d.undriven ? {} : outOf(d)), again: (d.again ?? []).map((x) => ({ args: x.args, ...outOf(x) })), omitted: (d.omitted ?? []).map((x) => ({ args: x.args, at: x.undefinedAt ?? null, ...outOf(x), world: !!x.trace?.length })), world: !!d.trace?.length || !!d.pending, constructed: d.constructed ?? null, methods: d.methods ?? null }));

// ----- the mutants: one edit per site of the unit (mutate.mjs), each compiled from its text beside the candidate, each
// case replayed against it from the same seed (as the parameter trials replay a base); a mutant is killed when the case's
// outcome differs, when the mutant asks the world where the unit did not, or when it runs out of its bound. Each mutant
// stops at its first killer. No type check of a mutant here (a child under the permission model writes no file; the
// bench's planted mutants are type-checked at their making). LEAN_BREAK=new-test-mutants: no mutant planted
async function killsOf({ candidate, unit, spec, cases, seed, ms, load, project, handedParams = null, now = Date.now }) {
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
      env.callAnswers = new Map(); handedDraws(env, handedParams);
      let o; try { o = await observe({ env, unit: picked }, spec, inputs, ms); } catch (e) { entry.killer = c.i; entry.how = `the run failed: ${String(e?.message ?? e).slice(0, 80)}`; break; }
      if (o.harness) { entry.killer = c.i; entry.how = 'out of its bound'; break; }
      const out = Object.hasOwn(o.outcome, 'threw') ? { threw: render(o.raw?.threw) } : { returned: o.drives?.length ? o.outcome.returned : render(o.raw?.returned) }; // before the drives, as the case holds it
      const was = Object.hasOwn(c.outcome, 'threw') ? { threw: c.outcome.threw } : { returned: c.outcome.returned };
      if (JSON.stringify(out) !== JSON.stringify(was)) { entry.killer = c.i; entry.how = 'a different outcome'; break; }
      const calls = callbackCalls(c.args, requestsOf(o), env); // (lane w9am) a callback case's requests are its callbacks' calls, which the test asserts
      if (calls === null || (!c.callbacks && o.trace.length)) { entry.killer = c.i; entry.how = 'asked the world'; break; }
      if (c.callbacks && JSON.stringify(calls) !== JSON.stringify(c.callbacks)) { entry.killer = c.i; entry.how = 'different calls of a callback'; break; }
      if (JSON.stringify(driveView(o.drives)) !== JSON.stringify(driveView(c.drives))) { entry.killer = c.i; entry.how = 'a handed-out function did otherwise'; break; }
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

export async function writeNewTest({ candidate, unit, spec, declared = null, handedParams = null, nullable = false, cases = [], statements = null, lines = null, seed = 1, ms = 2000, options, load, project }) {
  const listed = statements ?? [];
  const reachedAny = new Set(cases.flatMap((c) => c.reached ?? []));
  // the unit as the repository's runner imports it: a top-level binding the module exports under its own name, or its default
  const exported = spec?.exported ?? null, binding = unit.includes('.') ? null : unit;
  const { runner, dir } = runnerOf(candidate);
  const dialect = runner ?? 'vitest';
  const whys = new Map();
  const usable = cases.filter((c) => { const u = usableCase(c, { binding: binding ?? unit, dialect, isAsync: c.thenable || !!spec?.isAsync, handedParams, defs: declared?.defs ?? {}, nullable, paramNames: (declared?.params ?? spec?.params ?? []).map((p) => p.name), typed: /\.[cm]?tsx?$/.test(candidate) }); if (!u.ok) whys.set(u.why, (whys.get(u.why) ?? 0) + 1); return u.ok; });
  const closed = cases.filter((c) => !c.world).length;
  const cover = (reason, extra = {}) => ({ kind: 'new:coverage', phase: 'test', reason, ...extra });
  if (!usable.length) return cover(cases.length ? `${closed} closed call(s)${closed < cases.length ? ` and ${cases.length - closed} call(s) whose only requests call a callback` : ''}, none a test can restate by value: ${[...whys].map(([w, n]) => `${n} ${WHY[w]}`).join('; ')} (needs a stub)` : 'no closed call of the unit: every drawn input reached the world or was not admitted by the declared types');
  if (!binding) return cover(`the unit ${unit} is a member (a class method or a property): the runner cannot call it by name (needs a stub)`);
  if (exported === false) return cover(`the unit ${unit} is not exported: the repository's runner cannot import it (needs a stub)`);
  const place = placeOf(candidate, unit, runner);
  const kills = await killsOf({ candidate, unit, spec, cases: usable, seed, ms, load, project, handedParams });
  const kept = selectCases(usable, listed, kills);
  const reached = new Set(kept.flatMap((c) => c.reached ?? []));
  const missed = listed.filter((t) => !reached.has(t)), unreached = listed.filter((t) => !reachedAny.has(t));
  const isAsync = kept.some((c) => c.thenable) || !!spec?.isAsync;
  let text;
  try { text = testText({ unit, binding, defaultExport: exported === 'default', importFrom: place.importFrom, dialect, cases: kept, isAsync }); }
  catch (e) { return cover(`no source for a case: ${String(e?.message ?? e).slice(0, 160)}`); }
  const at = (t) => lines?.[t] ?? t;
  const record = { kind: 'new:proposed-test', unit, file: path.relative(dir, place.file), runner: runner ?? 'unknown (vitest dialect)', dialect, cases: kept.length, closed, usable: usable.length, drives: { cases: kept.filter((c) => c.drives?.length && c.handed).length, calls: kept.reduce((n, c) => n + (c.drives?.length ? c.handed?.calls ?? 0 : 0), 0) }, callbacks: { cases: kept.filter((c) => c.callbacks?.length && c.handed).length, calls: kept.reduce((n, c) => n + (c.handed?.callbackCalls ?? 0), 0) }, statements: { listed: listed.length, reached: reached.size, missed: missed.map(at), unreached: unreached.map(at) }, mutants: mutantsOf(kills), text };
  if (missed.length) return cover(`a test from the closed calls completes ${reached.size} of ${listed.length} statements of the unit (missed: lines ${missed.map(at).join(', ')}): below the bar, no test proposed`, { statements: record.statements, cases: kept.length });
  // the self-check: the text runs under lean's runner model against the candidate; every case passes, the run asks nothing of the world
  if (!broken('new-test-check') && load) {
    const virtual = path.join(path.dirname(path.resolve(candidate)), `.lean_test_${process.pid}_${unit.replace(/[^\w$]+/g, '_')}.test${path.extname(candidate) || '.ts'}`);
    const textAt = text.replace(`'${place.importFrom}'`, `'./${path.basename(candidate, path.extname(candidate))}'`);
    const r = await runTests({ candidate: path.resolve(candidate), unit, testFiles: [virtual], texts: new Map([[virtual, textAt]]), ms, seed, load, graphWorld: () => [], options });
    const s = r.summary, bad = r.records.filter((x) => x.kind !== 'new:coverage' || x.phase !== 'test' || !/does not import/.test(String(x.reason)));
    record.check = { files: s.files, selected: s.selected, passed: s.passed, failed: s.failed, world: s.world, notModelled: s.notModelled, unsettled: s.unsettled };
    if (s.selected !== kept.length || s.passed !== kept.length) return cover(`the test does not pass under lean's runner model on the candidate (selected ${s.selected}, passed ${s.passed}, failed ${s.failed}, world ${s.world}, not modelled ${s.notModelled}, unsettled ${s.unsettled}; ${bad.map((x) => x.reason ?? x.error?.assertion ?? x.error?.message ?? '').filter(Boolean).slice(0, 2).join('; ').slice(0, 200)})`, { statements: record.statements, cases: kept.length });
  }
  return record;
}
