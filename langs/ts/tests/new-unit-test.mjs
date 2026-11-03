#!/usr/bin/env node
// The new-unit test checks (design/new-unit-test.md): a unit no parent holds gets a test from its closed calls
// (exec/new-test.mjs), the record `new:proposed-test` beside the row. Each check names the mechanism it rests on:
//   new-reach         exec/new-unit.mjs newUnitProbes: the unit's statements are probed on the candidate-only path, so the
//                     record counts the statements the kept cases complete (bucket: 7 of 7)
//   new-test-cases    exec/new-unit.mjs runNew: every closed call is a case (bucket: 24 closed calls, cases kept)
//   new-test-source   exec/new-test.mjs toSource: a returned value prints as its JavaScript (bucket: ":zero")
//   new-test-check    exec/new-test.mjs writeNewTest: the text runs under lean's runner model against the candidate (the
//                     record's `check`: every kept case passes, no world)
//   new-test-mutants  exec/new-test.mjs killsOf: mutants planted in the unit, each told apart by a kept case (bucket: killed >= 1)
//   new-test          exec/new-unit.mjs runNew: the writer runs at all (a coverage record names why when no test is written)
//   new-test-drives   exec/new-test.mjs usableCase/handedBody: a call that handed out functions is a case; the test binds
//                     what the unit returned and calls each handed-out function as lean drove it (handed.ts counter)
//   new-test-drive-types exec/new-unit.mjs handedDraws: a drive draws its arguments by the declared parameter types where
//                     the unit's value holds the function, and calls a method on its holder (handed.ts makeAdder, tally)
//   new-test-callbacks exec/new-unit.mjs callbackCalls: a call whose only requests call a callback it was handed is a
//                     case; the test passes a spy answering what lean's fake answered and asserts the calls (handed.ts mapAll)
// Plain checks (no mechanism of their own): a unit that asks the world gets no test (world.ts fetchJson: "no closed call");
// a helper no export reaches gets no test (calc.ts helper: "not exported"); a promise-returning unit awaits (later: resolves);
// a handed-out function that asks the world gets no test, with that reason (handed.ts reader); the node:test dialect
// asserts a handed-out function and a callback's calls with node:assert alone (node-runner/handed.ts).
//
//   node tests/new-unit-test.mjs           each check green
//   node tests/new-unit-test.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'fixtures', 'new-unit-test');
const brk = process.argv.includes('--break');

function lean(args, mechanism) {
  const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
  const r = spawnSync('node', [path.join(here, '..', 'check.mjs'), ...args, '--no-project', '--json'], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout); } catch { return { verdict: `unparsed (exit ${r.status})`, certificate: { newUnit: { records: [] } }, stderr: String(r.stderr).slice(-300) }; }
}
const records = (r) => r.certificate?.newUnit?.records ?? [];
const proposed = (r) => records(r).find((x) => x.kind === 'new:proposed-test') ?? null;
const coverageTest = (r) => records(r).find((x) => x.kind === 'new:coverage' && x.phase === 'test') ?? null;
const calc = path.join(fixtures, 'calc.ts'), handed = path.join(fixtures, 'handed.ts');
const cache = new Map();
const run = (unit, file = calc, m = null, n = 24) => { const k = `${file}|${unit}|${m}|${n}`; if (!cache.has(k)) cache.set(k, lean(['--candidate', file, '--unit', unit, '--n', String(n)], m)); return cache.get(k); };

const checks = [
  ['new-reach', 'the statements of a unit no parent holds are probed and counted', (m) => {
    const t = proposed(run('bucket', calc, m)); const s = t?.statements ?? {};
    const ok = !!t && s.listed === 7 && s.reached === 7 && s.missed.length === 0;
    return { ok, detail: t ? `listed ${s.listed}, reached ${s.reached}, missed ${JSON.stringify(s.missed)}` : `no record: ${coverageTest(run('bucket', calc, m))?.reason ?? ''}` };
  }],
  ['new-test-cases', 'every closed call is a case', (m) => {
    const r = run('bucket', calc, m); const t = proposed(r);
    const ok = !!t && t.closed === 24 && t.cases >= 3;
    return { ok, detail: t ? `closed ${t.closed}, cases ${t.cases}` : `no record: ${coverageTest(r)?.reason ?? ''}` };
  }],
  ['new-test-source', 'a returned value prints as its JavaScript', (m) => {
    const t = proposed(run('bucket', calc, m)); const text = t?.text ?? '';
    const ok = /toEqual\(":zero"\)/.test(text) && /toThrow\("not a number: /.test(text) && !/toEqual\(null\)/.test(text);
    return { ok, detail: text ? text.split('\n').filter((l) => /expect\(/.test(l)).slice(0, 2).join(' | ') : 'no text' };
  }],
  ['new-test-check', 'the text runs under the runner model against the candidate', (m) => {
    const t = proposed(run('bucket', calc, m)); const c = t?.check;
    const ok = !!c && c.selected === t.cases && c.passed === t.cases && c.world === 0;
    return { ok, detail: c ? JSON.stringify(c) : 'no check on the record' };
  }],
  ['new-test-mutants', 'mutants planted in the unit are told apart by the kept cases', (m) => {
    const t = proposed(run('bucket', calc, m)); const mu = t?.mutants;
    const ok = !!mu && !mu.error && mu.planted >= 5 && mu.killed >= 1 && mu.killed <= mu.planted;
    return { ok, detail: mu ? `planted ${mu.planted}, killed ${mu.killed}${mu.error ? ', ' + mu.error : ''}` : 'no mutants on the record' };
  }],
  ['new-test', 'the writer runs: a record, or the reason none is written', (m) => {
    const r = run('bucket', calc, m);
    const ok = !!proposed(r) || !!coverageTest(r);
    return { ok, detail: proposed(r) ? 'proposed' : coverageTest(r)?.reason ?? 'neither record' };
  }],
  [null, 'a unit that asks the world gets no test, with the reason', () => {
    const r = run('fetchJson', path.join(fixtures, 'world.ts'), null, 12); const c = coverageTest(r);
    const ok = !proposed(r) && !!c && /no closed call/.test(c.reason);
    return { ok, detail: c?.reason ?? (proposed(r) ? 'a test was proposed' : 'no coverage record') };
  }],
  [null, 'a helper no export reaches gets no test, with the reason', () => {
    const r = run('helper'); const c = coverageTest(r);
    const ok = !proposed(r) && !!c && /not exported/.test(c.reason);
    return { ok, detail: c?.reason ?? (proposed(r) ? 'a test was proposed' : 'no coverage record') };
  }],
  [null, 'a promise-returning unit is awaited', () => {
    const t = proposed(run('later')); const text = t?.text ?? '';
    const ok = /async \(\) =>/.test(text) && /\.resolves\.toEqual\(/.test(text);
    return { ok, detail: text.split('\n').filter((l) => /resolves/.test(l)).slice(0, 1).join('') || 'no awaited case' };
  }],
  ['new-test-drives', 'a function the unit handed out is called by the test as lean drove it', (m) => {
    const t = proposed(run('counter', handed, m)); const text = t?.text ?? '';
    const ok = !!t && t.drives?.cases >= 1 && t.drives.calls >= 4 && /const out = counter\(/.test(text) && /expect\(out\.next\(\)\)\.toEqual\(\d+\)/.test(text) && /out\.reset\(\)/.test(text) && /next: expect\.any\(Function\)/.test(text) && t.check?.passed === t.cases && t.statements.missed.length === 0;
    return { ok, detail: t ? `drives ${JSON.stringify(t.drives)}, reached ${t.statements.reached} of ${t.statements.listed}, ${text.split('\n').filter((l) => /out\./.test(l)).slice(0, 2).join(' | ').trim()}` : coverageTest(run('counter', handed, m))?.reason ?? 'no record' };
  }],
  ['new-test-drive-types', 'a handed-out function is called on arguments its declared types admit, a method on its holder', (m) => {
    const a = proposed(run('makeAdder', handed, m)), b = proposed(run('tally', handed, m));
    const calls = [...(a?.text ?? '').matchAll(/out\(([^)]*)\)/g)].map((x) => x[1]);
    const ok = !!a && !!b && calls.length >= 3 && calls.every((x) => /^-?(?:\d+(?:\.\d+)?|Infinity)$/.test(x.trim())) && /expect\(out\.inc\(\)\)\.toEqual\(\d+\)/.test(b.text) && a.check?.passed === a.cases && b.check?.passed === b.cases;
    return { ok, detail: `makeAdder: ${a ? `out(${calls.slice(0, 4).join('), out(')})` : coverageTest(run('makeAdder', handed, m))?.reason ?? 'no record'}; tally: ${b ? 'proposed' : coverageTest(run('tally', handed, m))?.reason ?? 'no record'}` };
  }],
  ['new-test-callbacks', 'a callback the unit is handed is a spy answering what lean answered, its calls asserted', (m) => {
    const t = proposed(run('mapAll', handed, m)); const text = t?.text ?? '';
    const ok = !!t && t.callbacks?.cases >= 1 && t.callbacks.calls >= 1 && /const f = vi\.fn\(\)\.mockReturnValueOnce\(/.test(text) && /expect\(f\)\.toHaveBeenCalledTimes\([1-9]\)/.test(text) && /expect\(f\)\.toHaveBeenNthCalledWith\(1, /.test(text) && t.check?.passed === t.cases && t.statements.missed.length === 0;
    return { ok, detail: t ? `callbacks ${JSON.stringify(t.callbacks)}, ${text.split('\n').filter((l) => /vi\.fn|NthCalled/.test(l)).slice(0, 2).map((l) => l.trim()).join(' | ')}` : coverageTest(run('mapAll', handed, m))?.reason ?? 'no record' };
  }],
  [null, 'a handed-out function that asks the world gets no test, with the reason', () => {
    const r = run('reader', handed); const c = coverageTest(r);
    const ok = !proposed(r) && !!c && /a handed-out function whose outcome holds a value of the world/.test(c.reason);
    return { ok, detail: c?.reason ?? (proposed(r) ? 'a test was proposed' : 'no coverage record') };
  }],
  [null, 'the node:test dialect asserts handed-out functions and callbacks with node:assert', () => {
    const file = path.join(fixtures, 'node-runner', 'handed.ts'); const a = proposed(run('counter', file)), b = proposed(run('mapAll', file));
    const ok = !!a && !!b && a.dialect === 'node:test' && /assert\.strictEqual\(typeof out\.next, 'function'\)/.test(a.text) && /assert\.deepStrictEqual\(out\.next\(\), \d+\)/.test(a.text) && /const fCalls: unknown\[\]\[\] = \[\];/.test(b.text) && /assert\.deepStrictEqual\(fCalls, \[\[/.test(b.text) && a.check?.passed === a.cases && b.check?.passed === b.cases;
    return { ok, detail: `${a ? a.dialect : 'counter: none'}; ${b ? (b.text.split('\n').find((l) => /fCalls, \[\[/.test(l)) ?? 'no call assertion').trim() : 'mapAll: none'}` };
  }],
];

let red = 0;
for (const [mechanism, what, check] of checks) {
  if (brk && !mechanism) continue;
  const r = check(brk ? mechanism : null);
  const pass = brk ? !r.ok : r.ok;
  if (!pass) red++;
  console.log(`| ${mechanism ?? 'plain'} | ${what} | ${brk ? (r.ok ? 'GREEN (not caught)' : 'RED (caught)') : r.ok ? 'PASS' : 'FAIL'} | ${String(r.detail).slice(0, 160)} |`);
}
console.log(`new-unit-test${brk ? ' --break' : ''}: ${checks.filter(([m]) => !brk || m).length} checks, ${red} failed`);
process.exit(red ? 1 : 0);
