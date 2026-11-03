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

export const CASES = 12; // the cases a proposed test holds at most (design/constants.md)

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

// ----- the cases kept: the ones that complete a statement no kept case completed, then one per distinct outcome -----
export function selectCases(usable, statements) {
  const kept = [], have = new Set(), outcomes = new Set();
  const key = (c) => JSON.stringify(c.outcome);
  for (const c of usable) { const fresh = (c.reached ?? []).filter((t) => !have.has(t)); if (fresh.length && kept.length < CASES) { kept.push(c); for (const t of c.reached) have.add(t); outcomes.add(key(c)); } }
  for (const c of usable) { if (kept.length >= CASES) break; if (kept.includes(c) || outcomes.has(key(c))) continue; kept.push(c); outcomes.add(key(c)); }
  if (!kept.length && usable.length) kept.push(usable[0]);
  return kept.sort((a, b) => a.i - b.i);
}

export async function writeNewTest({ candidate, unit, spec, cases = [], statements = null, lines = null, seed = 1, ms = 2000, options, load }) {
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
  const kept = selectCases(usable, listed);
  const reached = new Set(kept.flatMap((c) => c.reached ?? []));
  const missed = listed.filter((t) => !reached.has(t)), unreached = listed.filter((t) => !reachedAny.has(t));
  const isAsync = kept.some((c) => c.thenable) || !!spec?.isAsync;
  let text;
  try { text = testText({ unit, binding, defaultExport: exported === 'default', importFrom: place.importFrom, dialect, cases: kept, isAsync }); }
  catch (e) { return cover(`no source for a case: ${String(e?.message ?? e).slice(0, 160)}`); }
  const at = (t) => lines?.[t] ?? t;
  const record = { kind: 'new:proposed-test', unit, file: path.relative(dir, place.file), runner: runner ?? 'unknown (vitest dialect)', dialect, cases: kept.length, closed: cases.length, usable: usable.length, statements: { listed: listed.length, reached: reached.size, missed: missed.map(at), unreached: unreached.map(at) }, text };
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
