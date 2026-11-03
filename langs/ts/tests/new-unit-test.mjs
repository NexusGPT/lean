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
//   new-test-world    exec/fake.mjs answerOf + exec/new-unit.mjs runNew + exec/new-test.mjs worldOf: a call that asked the
//                     world is a case with lean's answers (world.ts fetchJson: a test whose self-check passes, world 0)
//   new-test-stubs    exec/new-test.mjs stubsOf: the answers as the runner's stubs (world.ts readConfig: vi.mock of node:fs)
//   new-test-calls    exec/new-test.mjs callsOf: the requests asserted (world.ts saveNote: the write's path and content)
//   url-strings       exec/spec.mjs: a unit that hands a string to the URL parser meets URLs (fetchJson: a response stubbed)
// Plain checks (no mechanism of their own): the clock read once is fake timers (stamp); Math.random is spied (pick); an
// argument lean answers member by member is an object of its answers (describeUser); a unit
// that asks the world where no stub answers gets no test, its reason naming the surface (world.ts elapsed: performance);
// a helper no export reaches gets no test (calc.ts helper: "not exported"); a promise-returning unit awaits (later: resolves).
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
const calc = path.join(fixtures, 'calc.ts'), world = path.join(fixtures, 'world.ts');
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
  // (lane w9al) a unit that asks the world: its test stubs lean's answers and asserts the requests (design/w9al-world-stubs.md)
  ['new-test-world', 'a unit that asks the world gets a test from its calls and lean\'s answers to them', (m) => {
    const r = run('fetchJson', world, m); const t = proposed(r); const c = t?.check;
    const ok = !!t && t.world?.asked > 0 && t.world.surfaces.includes('global:fetch') && !!c && c.selected === t.cases && c.passed === t.cases && c.world === 0;
    return { ok, detail: t ? `world ${JSON.stringify(t.world)}, check ${JSON.stringify(c)}` : coverageTest(r)?.reason ?? 'no record' };
  }],
  ['new-test-stubs', 'the answers are stubs in the runner\'s dialect, and the test passes under them', (m) => {
    const r = run('readConfig', world, m); const t = proposed(r); const text = t?.text ?? ''; const c = t?.check;
    const ok = /vi\.mock\("node:fs", /.test(text) && /vi\.mocked\(stub_node_fs\.readFileSync\)\.mock(?:ReturnValue|ImplementationOnce)/.test(text) && !!c && c.passed === t.cases && c.world === 0;
    return { ok, detail: t ? `${text.split('\n').filter((l) => /vi\.(?:mock|mocked)\(/.test(l)).slice(0, 2).join(' | ').slice(0, 140)}; check ${JSON.stringify(c)}` : coverageTest(r)?.reason ?? 'no record' };
  }],
  ['new-test-calls', 'the requests the unit made are asserted (a write\'s path and content)', (m) => {
    const r = run('saveNote', world, m); const t = proposed(r); const text = t?.text ?? '';
    const ok = !!t && t.world?.calls > 0 && /expect\(stub_node_fs\.writeFileSync\)\.toHaveBeenNthCalledWith\(1, "[^"]*note\.txt", /.test(text) && t.check?.passed === t.cases;
    return { ok, detail: t ? `calls ${t.world?.calls}: ${text.split('\n').find((l) => /NthCalledWith/.test(l))?.trim() ?? 'none asserted'}` : coverageTest(r)?.reason ?? 'no record' };
  }],
  ['url-strings', 'a unit that hands a string to the URL parser meets one it admits (the request is made)', (m) => {
    const t = proposed(run('fetchJson', world, m)); const text = t?.text ?? '';
    const ok = /mockResolvedValueOnce\(new Response\(/.test(text) && /\.resolves\./.test(text);
    return { ok, detail: text.split('\n').find((l) => /new Response/.test(l))?.trim().slice(0, 140) ?? coverageTest(run('fetchJson', world, m))?.reason ?? 'no response stubbed' };
  }],
  [null, 'the clock read once is fake timers at lean\'s instant', () => {
    const t = proposed(run('stamp', world)); const text = t?.text ?? '';
    const ok = /vi\.useFakeTimers\(/.test(text) && /vi\.setSystemTime\(17\d{11}\);/.test(text) && t.check?.passed === t.cases;
    return { ok, detail: text.split('\n').filter((l) => /setSystemTime|toEqual/.test(l)).map((l) => l.trim()).join(' | ') || coverageTest(run('stamp', world))?.reason || 'no record' };
  }],
  [null, 'Math.random is spied with lean\'s draws', () => {
    const t = proposed(run('pick', world)); const text = t?.text ?? '';
    const ok = /vi\.spyOn\(Math, 'random'\)\.mockReturnValueOnce\(0\.\d+\)/.test(text) && t.check?.passed === t.cases;
    return { ok, detail: text.split('\n').find((l) => /spyOn/.test(l))?.trim() ?? coverageTest(run('pick', world))?.reason ?? 'no record' };
  }],
  [null, 'an argument lean answers member by member is passed as an object of its answers, its calls asserted', () => {
    const t = proposed(run('describeUser', world)); const text = t?.text ?? '';
    const ok = !!t && t.world?.surfaces.includes('input') && /const input_arg0 = \{ find: vi\.fn\(\)\.mock(?:Resolved|Rejected)ValueOnce\(/.test(text) && /expect\(input_arg0\.find\)\.toHaveBeenNthCalledWith\(1, /.test(text) && t.check?.passed === t.cases && t.check.world === 0;
    return { ok, detail: t ? text.split('\n').find((l) => /const input_arg0/.test(l))?.trim().slice(0, 150) ?? 'no input stub' : coverageTest(run('describeUser', world))?.reason ?? 'no record' };
  }],
  [null, 'a unit that asks the world where no stub answers gets no test, and the reason names the surface', () => {
    const r = run('elapsed', world); const c = coverageTest(r);
    const ok = !proposed(r) && !!c && /performance/.test(c.reason);
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
