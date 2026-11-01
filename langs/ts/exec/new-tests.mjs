// the PR's own tests of a unit no parent holds (design/w1h-new-units.md, "new:test"): a test the PR adds that calls the
// unit is part of the unit's declaration (what its author says it does), so it runs against the candidate, under the
// same sandbox and loader as the unit's draws (new-unit.mjs loadCandidate). A test that fails is `new:test`, a fact: this
// test, as written, fails on this unit. It is a fact only when the run never asked lean's world anything: a test whose
// module graph links a package lean fakes, whose load or run reached a fake (a clock, a global, a package), or whose code
// names a global the sandbox answers with a handle is `new:coverage` with that reason, never a failure; so is a test that
// uses a runner feature this module does not model (a module mock, a spy, fake timers, a matcher it does not hold), and one
// that does not settle within its bound. The runner here is a model of vitest's and jest's API, the part the tests read.
import path from 'node:path';
import { ts } from '../common.mjs';
import { Environment, BudgetError, render } from './fake.mjs';
import { guardedCall } from './run.mjs';

// the specifiers the runner answers itself: the test frameworks' own modules
export const TEST_MODULES = new Set(['vitest', '@jest/globals', 'bun:test', 'node:test', 'node:assert', 'assert', 'node:assert/strict', 'assert/strict']);
// a runner feature that replaces what an import or the clock means: the file's tests are not the code's behaviour alone
const MOCKS = /\b(?:vi|jest)\s*\.\s*(mock|doMock|unmock|hoisted|stubGlobal|stubEnv|useFakeTimers|spyOn|mocked|importActual|importMock|setSystemTime)\b/;

class Gap extends Error { constructor(what) { super(`not modelled: ${what}`); this.gap = what; } }
class Failure extends Error { constructor(message) { super(message); this.name = 'AssertionError'; } }

// ---- equality, as the runners define it (toEqual: recursive, undefined members ignored; toStrictEqual: they count) ----
const tagOf = (v) => Object.prototype.toString.call(v);
const ASYM = Symbol('lean.asymmetric');
function equals(a, b, strict, seen = []) {
  if (b && typeof b === 'object' && b[ASYM]) return b[ASYM](a);
  if (a && typeof a === 'object' && a[ASYM]) return a[ASYM](b);
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a.__isFake || b.__isFake) throw new Gap('a comparison with a value of lean\'s world');
  const ta = tagOf(a); if (ta !== tagOf(b)) return false;
  if (seen.some(([x, y]) => x === a && y === b)) return true;
  seen = [...seen, [a, b]];
  if (ta === '[object Date]') return Object.is(a.getTime(), b.getTime());
  if (ta === '[object RegExp]') return a.source === b.source && a.flags === b.flags;
  if (ta === '[object Error]') return a.message === b.message && a.name === b.name;
  if (ta === '[object Map]') { if (a.size !== b.size) return false; for (const [k, v] of a) { if (!b.has(k) || !equals(v, b.get(k), strict, seen)) return false; } return true; }
  if (ta === '[object Set]') { if (a.size !== b.size) return false; const rest = [...b]; for (const x of a) { const i = rest.findIndex((y) => equals(x, y, strict, seen)); if (i < 0) return false; rest.splice(i, 1); } return true; }
  if (Array.isArray(a)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) { if (strict && (i in a) !== (i in b)) return false; if (!equals(a[i], b[i], strict, seen)) return false; } return true; }
  if (strict && Object.getPrototypeOf(a)?.constructor?.name !== Object.getPrototypeOf(b)?.constructor?.name) return false;
  const keys = (o) => Object.keys(o).filter((k) => strict || o[k] !== undefined);
  const ka = keys(a), kb = keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && equals(a[k], b[k], strict, seen));
}
function subset(a, b, seen = []) { // toMatchObject: every member of b is in a, recursively
  if (b && typeof b === 'object' && b[ASYM]) return b[ASYM](a);
  if (typeof b !== 'object' || b === null || typeof a !== 'object' || a === null) return equals(a, b, false);
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((x, i) => subset(a[i], x, seen));
  if (tagOf(b) !== '[object Object]') return equals(a, b, false);
  return Object.keys(b).every((k) => k in a && subset(a[k], b[k], seen));
}
const show = (v) => { try { return JSON.stringify(render(v)).slice(0, 200); } catch { return String(v).slice(0, 200); } };

function makeExpect(state) {
  const asym = (test) => ({ [ASYM]: test });
  function expect(actual, message) {
    const build = (negate, mode) => {
      const assert = (pass, text) => { state.assertions++; if (pass === negate) throw new Failure(`${message ? message + ': ' : ''}expected ${show(actual)} ${negate ? 'not ' : ''}${text}`); };
      const thrownBy = (fn) => { if (typeof fn !== 'function') throw new Failure(`expected a function, got ${show(fn)}`); try { fn(); } catch (e) { return { threw: true, error: e }; } return { threw: false }; };
      const m = {
        toBe: (e) => assert(Object.is(actual, e), `to be ${show(e)}`),
        toEqual: (e) => assert(equals(actual, e, false), `to equal ${show(e)}`),
        toStrictEqual: (e) => assert(equals(actual, e, true), `to strictly equal ${show(e)}`),
        toBeNull: () => assert(actual === null, 'to be null'),
        toBeUndefined: () => assert(actual === undefined, 'to be undefined'),
        toBeDefined: () => assert(actual !== undefined, 'to be defined'),
        toBeTruthy: () => assert(!!actual, 'to be truthy'),
        toBeFalsy: () => assert(!actual, 'to be falsy'),
        toBeNaN: () => assert(Number.isNaN(actual), 'to be NaN'),
        toBeTypeOf: (t) => assert(typeof actual === t, `to be of type ${t}`),
        toBeInstanceOf: (C) => assert(actual instanceof C, `to be an instance of ${C?.name}`),
        toBeGreaterThan: (e) => assert(actual > e, `to be greater than ${show(e)}`),
        toBeGreaterThanOrEqual: (e) => assert(actual >= e, `to be at least ${show(e)}`),
        toBeLessThan: (e) => assert(actual < e, `to be less than ${show(e)}`),
        toBeLessThanOrEqual: (e) => assert(actual <= e, `to be at most ${show(e)}`),
        toBeCloseTo: (e, digits = 2) => assert((actual === Infinity && e === Infinity) || (actual === -Infinity && e === -Infinity) || Math.abs(e - actual) < 10 ** -digits / 2, `to be close to ${show(e)} (${digits} digits)`),
        toContain: (e) => assert(typeof actual === 'string' ? actual.includes(e) : actual != null && typeof actual[Symbol.iterator] === 'function' ? [...actual].includes(e) : false, `to contain ${show(e)}`),
        toContainEqual: (e) => assert(actual != null && typeof actual[Symbol.iterator] === 'function' && [...actual].some((x) => equals(x, e, false)), `to contain an element equal to ${show(e)}`),
        toHaveLength: (k) => assert(actual != null && actual.length === k, `to have length ${k}`),
        toMatch: (e) => assert(typeof actual === 'string' && (typeof e === 'string' ? actual.includes(e) : e.test(actual)), `to match ${String(e)}`),
        toMatchObject: (e) => assert(subset(actual, e), `to match the object ${show(e)}`),
        toHaveProperty: (p, ...v) => { const keys = Array.isArray(p) ? p : String(p).split('.'); let cur = actual, has = true; for (const k of keys) { if (cur == null || !(k in Object(cur))) { has = false; break; } cur = cur[k]; } assert(has && (!v.length || equals(cur, v[0], false)), `to have property ${keys.join('.')}${v.length ? ' equal to ' + show(v[0]) : ''}`); },
        toThrow: (e) => {
          const r = thrownBy(actual); const err = r.error; const msg = err && typeof err === 'object' ? String(err.message) : String(err);
          const ok = r.threw && (e === undefined || (typeof e === 'string' ? msg.includes(e) : e instanceof RegExp || tagOf(e) === '[object RegExp]' ? e.test(msg) : typeof e === 'function' ? err instanceof e : e && typeof e === 'object' ? msg === e.message : false));
          state.assertions++; if (ok === negate) throw new Failure(`expected the function ${negate ? 'not ' : ''}to throw${e === undefined ? '' : ' ' + show(e)}${r.threw ? `; it threw ${show(err)}` : '; it returned'}`);
        },
      };
      m.toThrowError = m.toThrow;
      if (mode) { // resolves / rejects: the matchers wait for the promise, then judge what it settled to
        return new Proxy({}, { get: (t, k) => { if (k === 'then') return undefined; if (!Object.hasOwn(m, k)) throw new Gap(`matcher .${mode}.${String(k)}`); return async (...a) => { let v, ok; try { v = await actual; ok = true; } catch (e) { v = e; ok = false; } if (ok !== (mode === 'resolves')) throw new Failure(`expected the promise to ${mode === 'resolves' ? 'resolve' : 'reject'}; it ${ok ? 'resolved to' : 'rejected with'} ${show(v)}`); return expect(v, message)[negate ? 'not' : 'self'][k](...a); }; } });
      }
      return m;
    };
    const base = build(false), not = build(true);
    return new Proxy(base, { get: (t, k) => {
      if (k === 'not') return not; if (k === 'self') return base;
      if (k === 'resolves' || k === 'rejects') { const p = build(false, k); const n = build(true, k); return new Proxy(p, { get: (t2, k2) => (k2 === 'not' ? n : t2[k2]) }); }
      if (k === 'then') return undefined;
      if (Object.hasOwn(base, k)) return base[k];
      throw new Gap(`matcher .${String(k)}`);
    } });
  }
  Object.assign(expect, {
    any: (C) => asym((v) => (C === String ? typeof v === 'string' || v instanceof String : C === Number ? typeof v === 'number' || v instanceof Number : C === Boolean ? typeof v === 'boolean' : C === Function ? typeof v === 'function' : C === Object ? v !== null && typeof v === 'object' : v instanceof C)),
    anything: () => asym((v) => v !== null && v !== undefined),
    objectContaining: (o) => asym((v) => v !== null && typeof v === 'object' && Object.keys(o).every((k) => k in v && equals(v[k], o[k], false))),
    arrayContaining: (xs) => asym((v) => Array.isArray(v) && xs.every((x) => v.some((y) => equals(y, x, false)))),
    stringContaining: (s) => asym((v) => typeof v === 'string' && v.includes(s)),
    stringMatching: (re) => asym((v) => typeof v === 'string' && (typeof re === 'string' ? v.includes(re) : re.test(v))),
    closeTo: (e, digits = 2) => asym((v) => typeof v === 'number' && Math.abs(e - v) < 10 ** -digits / 2),
  });
  return new Proxy(expect, { get: (t, k) => (Object.hasOwn(t, k) || k === 'prototype' || typeof k === 'symbol' ? t[k] : (() => { throw new Gap(`expect.${String(k)}`); })) });
}
function makeAssert(state) { // node:assert, the part tests read
  const fail = (pass, text) => { state.assertions++; if (!pass) throw new Failure(text); };
  const a = (v, msg) => fail(!!v, msg ?? `expected ${show(v)} to be truthy`);
  Object.assign(a, {
    ok: a, equal: (x, y, msg) => fail(x == y, msg ?? `expected ${show(x)} == ${show(y)}`), notEqual: (x, y, msg) => fail(x != y, msg ?? `expected ${show(x)} != ${show(y)}`),
    strictEqual: (x, y, msg) => fail(Object.is(x, y), msg ?? `expected ${show(x)} to be ${show(y)}`), notStrictEqual: (x, y, msg) => fail(!Object.is(x, y), msg ?? `expected ${show(x)} not to be ${show(y)}`),
    deepEqual: (x, y, msg) => fail(equals(x, y, false), msg ?? `expected ${show(x)} to deep-equal ${show(y)}`), deepStrictEqual: (x, y, msg) => fail(equals(x, y, true), msg ?? `expected ${show(x)} to deep-strict-equal ${show(y)}`),
    notDeepStrictEqual: (x, y, msg) => fail(!equals(x, y, true), msg ?? `expected ${show(x)} not to deep-strict-equal ${show(y)}`),
    throws: (fn, e, msg) => { let threw = false, err; try { fn(); } catch (x) { threw = true; err = x; } fail(threw && (e === undefined || typeof e === 'string' || (typeof e === 'function' ? err instanceof e : e instanceof RegExp ? e.test(String(err?.message)) : true)), msg ?? (typeof e === 'string' ? e : `expected the function to throw${threw ? ' ' + show(e) : ''}`)); },
    match: (s, re, msg) => fail(typeof s === 'string' && re.test(s), msg ?? `expected ${show(s)} to match ${re}`),
  });
  a.strict = a;
  return new Proxy(a, { get: (t, k) => (Object.hasOwn(t, k) || typeof k === 'symbol' || k === 'prototype' ? t[k] : (() => { throw new Gap(`assert.${String(k)}`); })) });
}

// the registration API: describe blocks run at load, tests and hooks are collected in their scope
function makeRunner(state) {
  const root = { name: null, parent: null, hooks: { beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] }, ran: false };
  let scope = root;
  const fullName = (s, name) => { const parts = []; for (let x = s; x && x.name !== null; x = x.parent) parts.unshift(x.name); return [...parts, name].join(' > '); };
  const format = (name, row, i) => { const args = Array.isArray(row) ? row : [row]; let k = 0; let out = String(name).replace(/%[sdifjop#%]/g, (m) => (m === '%%' ? '%' : m === '%#' ? String(i) : show(args[k++]).replace(/^"|"$/g, ''))); if (row && typeof row === 'object' && !Array.isArray(row)) out = out.replace(/\$([\w.]+)/g, (m, key) => show(key.split('.').reduce((o, p) => o?.[p], row)).replace(/^"|"$/g, '')); return out; };
  const add = (name, fn, opts = {}) => { state.tests.push({ name: fullName(scope, String(name)), fn, scope, ...opts }); };
  const each = (register) => (table) => (name, fn) => { if (!Array.isArray(table)) throw new Gap('a tagged-template .each table'); table.forEach((row, i) => register(format(name, row, i), function () { return fn.apply(this, Array.isArray(row) ? row : [row]); })); };
  const test = (name, fn) => { if (typeof fn !== 'function') { if (fn && typeof fn === 'object') throw new Gap('test options'); add(name, null, { skipped: 'todo' }); return; } add(name, fn); };
  test.skip = (name) => add(name, null, { skipped: 'skip' }); test.todo = (name) => add(name, null, { skipped: 'todo' });
  test.only = test; test.concurrent = test; test.sequential = test;
  test.each = each(test); test.skip.each = () => (name) => add(name, null, { skipped: 'skip' }); test.only.each = test.each;
  test.skipIf = (c) => (c ? test.skip : test); test.runIf = (c) => (c ? test : test.skip);
  test.fails = () => { throw new Gap('test.fails'); };
  const describe = (name, fn) => { if (typeof fn !== 'function') { if (fn && typeof fn === 'object') throw new Gap('describe options'); return; } const s = { name: String(name), parent: scope, hooks: { beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] }, ran: false }; const was = scope; scope = s; try { const r = fn(); if (r && typeof r.then === 'function') throw new Gap('an async describe body'); } finally { scope = was; } };
  describe.skip = () => {}; describe.only = describe; describe.concurrent = describe; describe.sequential = describe; describe.todo = () => {};
  describe.each = each(describe); describe.skipIf = (c) => (c ? describe.skip : describe); describe.runIf = (c) => (c ? describe : describe.skip);
  const hook = (kind) => (fn) => { scope.hooks[kind].push(fn); };
  const vi = new Proxy({}, { get: (t, k) => (typeof k === 'symbol' ? undefined : () => { throw new Gap(`vi.${String(k)}`); }) });
  const expect = makeExpect(state), assert = makeAssert(state);
  const api = { describe, it: test, test, expect, assert, beforeAll: hook('beforeAll'), afterAll: hook('afterAll'), beforeEach: hook('beforeEach'), afterEach: hook('afterEach'), before: hook('beforeAll'), after: hook('afterAll'), vi, jest: vi, suite: describe };
  const modules = {};
  for (const m of ['vitest', '@jest/globals', 'bun:test']) modules[m] = api;
  modules['node:test'] = { ...api, default: test };
  for (const m of ['node:assert', 'assert', 'node:assert/strict', 'assert/strict']) modules[m] = { ...assert, default: assert };
  return { api, modules, root };
}

// the test files' tests that name the unit: the file imports the unit's binding from the candidate (a named import, the
// default when the unit is the default export, or a namespace's member); a test names it when its body, a hook of a
// describe around it, or a top-level helper of the file such a body names, names it (the helpers to a fixed point)
function selection(testFile, text, candidate, unit, options) {
  const sf = ts.createSourceFile(testFile, text, ts.ScriptTarget.Latest, true);
  const exportName = unit.includes('.') ? unit.split('.')[0] : unit;
  const names = new Set();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause || st.importClause.isTypeOnly || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const found = ts.resolveModuleName(st.moduleSpecifier.text, testFile, options ?? {}, ts.sys).resolvedModule?.resolvedFileName;
    if (!found || path.resolve(found) !== candidate) continue;
    const nb = st.importClause.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if ((el.propertyName ?? el.name).text === exportName && !el.isTypeOnly) names.add(el.name.text);
    if (nb && ts.isNamespaceImport(nb)) names.add(nb.name.text);
    if (st.importClause.name) names.add(st.importClause.name.text); // a default import: the candidate's default may be the unit; naming it is over-approximated, never under
  }
  if (!names.size) return null;
  const mentions = (node, set) => { let hit = false; const w = (n) => { if (hit) return; if (ts.isIdentifier(n) && set.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) hit = true; else ts.forEachChild(n, w); }; w(node); return hit; };
  const helpers = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) helpers.set(st.name.text, st);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) helpers.set(d.name.text, d.initializer);
    if (ts.isClassDeclaration(st) && st.name) helpers.set(st.name.text, st);
  }
  for (let grew = true; grew;) { grew = false; for (const [name, node] of helpers) if (!names.has(name) && mentions(node, names)) { names.add(name); grew = true; } }
  return { names, mock: MOCKS.exec(text)?.[0] ?? null };
}
const namesIn = (fn, names) => { let src; try { src = Function.prototype.toString.call(fn); } catch { return true; } return [...names].some((n) => new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}(?![\\w$])`).test(src)); };

// run every test file's tests in their order (a file's tests share its module state, as the runners run them), report
// the ones that name the unit
export async function runTests({ candidate, unit, testFiles, ms = 2000, seed = 1, load, graphWorld, options }) {
  const records = [], summary = { files: 0, selected: 0, passed: 0, failed: 0, notModelled: 0, world: 0, unsettled: 0, skipped: 0 };
  const cover = (file, reason, tests) => records.push({ kind: 'new:coverage', phase: 'test', file: path.basename(file), reason, ...(tests ? { tests } : {}) });
  for (const file of testFiles) {
    let text; try { text = (await import('node:fs')).readFileSync(file, 'utf8'); } catch (e) { cover(file, `unreadable: ${e.message}`); continue; }
    const sel = selection(file, text, candidate, unit, options);
    if (!sel) continue; // the file does not import the unit
    summary.files++;
    if (sel.mock) { cover(file, `the file replaces a module, a global or the clock (${sel.mock}): its tests are not the unit's behaviour alone`); summary.notModelled++; continue; }
    const state = { tests: [], assertions: 0 };
    const runner = makeRunner(state);
    const env = new Environment(seed * 7919 + 104729);
    let loaded;
    try { loaded = await load(file, env, { allow: new Set([file]), globals: runner.api, modules: runner.modules }); }
    catch (e) { cover(file, `the test file did not load: ${String(e?.message ?? e).slice(0, 200)}`); continue; }
    const worldAtLoad = graphWorld(loaded);
    let tainted = worldAtLoad.length ? worldAtLoad.slice(0, 3).join('; ') : null; // once the file's state holds a world value, every later result may rest on it
    const timeout = Math.max(ms * 5, 5000);
    const call = async (fn) => {
      if (fn.length > 0) throw new Gap('a done callback');
      const r = guardedCall(env, () => fn(), timeout);
      if (r && typeof r.then === 'function') { let timer; try { return await Promise.race([r, new Promise((_, no) => { timer = setTimeout(() => no(Object.assign(new Error('unsettled'), { unsettled: true })), timeout); })]); } finally { clearTimeout(timer); } }
      return r;
    };
    const chain = (s) => { const out = []; for (let x = s; x; x = x.parent) out.unshift(x); return out; };
    const selected = [];
    for (const t of state.tests) {
      const scopes = chain(t.scope);
      const named = !!t.fn && (namesIn(t.fn, sel.names) || scopes.some((s) => [...s.hooks.beforeAll, ...s.hooks.beforeEach, ...s.hooks.afterEach].some((h) => namesIn(h, sel.names))));
      if (named) summary.selected++;
      if (!t.fn) { if (named) summary.skipped++; continue; }
      env.trace.length = 0; env.pending.length = 0;
      let outcome;
      try {
        for (const s of scopes) if (!s.ran) { s.ran = true; for (const h of s.hooks.beforeAll) await call(h); }
        for (const s of scopes) for (const h of s.hooks.beforeEach) await call(h);
        state.assertions = 0;
        await call(t.fn);
        for (const s of [...scopes].reverse()) for (const h of s.hooks.afterEach) await call(h);
        outcome = { passed: true };
      } catch (e) {
        if (e instanceof BudgetError || e?.message === '__timeout__' || e?.unsettled) outcome = { unsettled: true };
        else if (e instanceof Gap) outcome = { gap: e.gap };
        else outcome = { failed: e };
      }
      const world = process.env.LEAN_BREAK === 'closed-test' ? null : tainted ?? (env.trace.length ? env.trace.slice(0, 3).map(({ op, path: p }) => `${op} ${p}`).join('; ') : null);
      if (env.trace.length && !tainted) tainted = `an earlier test or hook reached the world (${env.trace[0].op} ${env.trace[0].path})`;
      if (!named) continue;
      if (world && !outcome.passed) { summary.world++; selected.push({ test: t.name, world }); continue; }
      if (outcome.passed) { summary.passed++; continue; }
      if (outcome.unsettled) { summary.unsettled++; selected.push({ test: t.name, unsettled: true }); continue; }
      if (outcome.gap) { summary.notModelled++; selected.push({ test: t.name, gap: outcome.gap }); continue; }
      summary.failed++;
      const e = outcome.failed;
      records.push({ kind: 'new:test', file: path.basename(file), test: t.name, error: e instanceof Failure ? { assertion: e.message } : render(e), claim: 'this test, which the PR adds and which names the unit, fails when run against the candidate (under lean\'s runner model, the run asking nothing of the world)' });
    }
    const gaps = selected.filter((x) => x.gap), worlds = selected.filter((x) => x.world), unsettled = selected.filter((x) => x.unsettled);
    if (gaps.length) cover(file, `not modelled: ${[...new Set(gaps.map((x) => x.gap))].slice(0, 3).join(', ')}`, gaps.length);
    if (worlds.length) cover(file, `the test reached the world: ${worlds[0].world}`, worlds.length);
    if (unsettled.length) cover(file, 'the test did not settle within its bound', unsettled.length);
  }
  return { records, summary };
}
