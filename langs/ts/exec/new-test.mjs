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
const short = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function testText({ unit, binding, defaultExport, importFrom, dialect, cases, isAsync }) {
  const d = DIALECT[dialect] ?? DIALECT.vitest;
  const lines = [d.head, defaultExport ? `import ${binding} from '${importFrom}';` : `import { ${binding} } from '${importFrom}';`, '', `describe(${JSON.stringify(unit)}, () => {`];
  const callOf = (c) => `${binding}(${c.args.map((a) => toSource(a, c.shared)).join(', ')})`;
  const seen = new Map();
  for (const c of cases) {
    c.shared = { defs: [] };
    const call = callOf(c), threw = Object.hasOwn(c.outcome, 'threw');
    const err = threw ? c.outcome.threw : null, message = err && typeof err === 'object' ? String(err.message ?? '') : String(err ?? '');
    let name = threw ? `${short(call, 60)} throws` : `${short(call, 60)} -> ${short(toSource(c.outcome.returned, { defs: [] }), 40)}`;
    const k = (seen.get(name) ?? 0) + 1; seen.set(name, k); if (k > 1) name += ` (${k})`;
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
      if (o.trace.length) { entry.killer = c.i; entry.how = 'asked the world'; break; }
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

export async function writeNewTest({ candidate, unit, spec, cases = [], statements = null, lines = null, seed = 1, ms = 2000, options, load, project }) {
  const listed = statements ?? [];
  const reachedAny = new Set(cases.flatMap((c) => c.reached ?? []));
  const usable = cases.filter((c) => !c.drives && !holdsWorld(c.args) && !holdsWorld(c.outcome.returned ?? c.outcome.threw));
  const cover = (reason, extra = {}) => ({ kind: 'new:coverage', phase: 'test', reason, ...extra });
  if (!usable.length) return cover(cases.length ? `${cases.length} closed call(s), none a test can restate by value: each holds a value of lean's world or hands out a function (needs a stub)` : 'no closed call of the unit: every drawn input reached the world or was not admitted by the declared types');
  // the unit as the repository's runner imports it: a top-level binding the module exports under its own name, or its default
  const exported = spec?.exported ?? null, binding = unit.includes('.') ? null : unit;
  if (!binding) return cover(`the unit ${unit} is a member (a class method or a property): the runner cannot call it by name (needs a stub)`);
  if (exported === false) return cover(`the unit ${unit} is not exported: the repository's runner cannot import it (needs a stub)`);
  const { runner, dir } = runnerOf(candidate);
  const dialect = runner ?? 'vitest';
  const place = placeOf(candidate, unit, runner);
  const kills = await killsOf({ candidate, unit, spec, cases: usable, seed, ms, load, project });
  const kept = selectCases(usable, listed, kills);
  const reached = new Set(kept.flatMap((c) => c.reached ?? []));
  const missed = listed.filter((t) => !reached.has(t)), unreached = listed.filter((t) => !reachedAny.has(t));
  const isAsync = kept.some((c) => c.thenable) || !!spec?.isAsync;
  let text;
  try { text = testText({ unit, binding, defaultExport: exported === 'default', importFrom: place.importFrom, dialect, cases: kept, isAsync }); }
  catch (e) { return cover(`no source for a case: ${String(e?.message ?? e).slice(0, 160)}`); }
  const at = (t) => lines?.[t] ?? t;
  const record = { kind: 'new:proposed-test', unit, file: path.relative(dir, place.file), runner: runner ?? 'unknown (vitest dialect)', dialect, cases: kept.length, closed: cases.length, usable: usable.length, statements: { listed: listed.length, reached: reached.size, missed: missed.map(at), unreached: unreached.map(at) }, mutants: mutantsOf(kills), text };
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
