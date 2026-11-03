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
//   new-test-world    exec/fake.mjs answerOf + exec/new-unit.mjs runNew + exec/new-test.mjs worldOf: a call that asked the
//                     world is a case with lean's answers (world.ts fetchJson: a test whose self-check passes, world 0)
//   new-test-stubs    exec/new-test.mjs stubsOf: the answers as the runner's stubs (world.ts readConfig: vi.mock of node:fs)
//   new-test-calls    exec/new-test.mjs callsOf: the requests asserted (world.ts saveNote: the write's path and content)
//   url-strings       exec/spec.mjs: a unit that hands a string to the URL parser meets URLs (fetchJson: a response stubbed)
//   new-test-drive-stubs exec/new-test.mjs usableCase/handedBody (lane w9as): a case that asked the world and handed out a
//                     function is called under the case's stubs, its drives' requests answered in request order (joint.ts
//                     loader: a drive's file read is node:fs mocked; since: the clock of the call, drives closed)
//   new-test-callback-stubs exec/new-unit.mjs callbackCalls `others` (lane w9as): a callback's calls beside a request the
//                     world's stubs answer get a spy (joint.ts tagAll: the spy and the clock)
// (lane w9au, design/w9au-import-follow.md) a unit whose reach crosses an import the checker follows only as the
// repository resolves it (fixtures/new-unit-test/imports, a workspace read with its own tsconfig files):
//   reach-resolve     common.mjs resolveFrom: an alias of another package's own tsconfig (later: a test), a workspace
//                     package's manifest entry read back to its source (gauge: the source's read of document is seen)
//   reach-packages    exec/new-unit.mjs importSurface: a declared package the checkout does not install (label: a test)
//   reach-builtins    exec/new-unit.mjs importSurface: node:net without Node's declarations (hostKind: a test)
//   reach-reason      exec/new-unit.mjs unitWorld: an import still not followed names why (bannerText)
// Plain checks (no mechanism of their own): the clock read once is fake timers (stamp); Math.random is spied (pick); an
// argument lean answers member by member is an object of its answers (describeUser); a unit that asks the world where no
// stub answers gets no test, its reason naming the surface (world.ts elapsed: performance); a helper no export reaches
// gets no test (calc.ts helper: "not exported"); a promise-returning unit awaits (later: resolves); a handed-out function
// that asks the world where no stub answers gets no test, with that reason (handed.ts reader); the node:test dialect
// asserts a handed-out function and a callback's calls with node:assert alone (node-runner/handed.ts), and a callback's
// spy beside a hand stub of the clock restored in `finally` (node-runner/joint.ts).
//
//   node tests/new-unit-test.mjs           each check green
//   node tests/new-unit-test.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'fixtures', 'new-unit-test');
const brk = process.argv.includes('--break');

function lean(args, mechanism, project = null) {
  const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
  const r = spawnSync('node', [path.join(here, '..', 'check.mjs'), ...args, ...(project ? ['--project', project] : ['--no-project']), '--json'], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout); } catch { return { verdict: `unparsed (exit ${r.status})`, certificate: { newUnit: { records: [] } }, stderr: String(r.stderr).slice(-300) }; }
}
const records = (r) => r.certificate?.newUnit?.records ?? [];
const proposed = (r) => records(r).find((x) => x.kind === 'new:proposed-test') ?? null;
const coverageTest = (r) => records(r).find((x) => x.kind === 'new:coverage' && x.phase === 'test') ?? null;
const calc = path.join(fixtures, 'calc.ts'), handed = path.join(fixtures, 'handed.ts'), world = path.join(fixtures, 'world.ts'), joint = path.join(fixtures, 'joint.ts');
const cache = new Map();
const run = (unit, file = calc, m = null, n = 24, project = null) => { const k = `${file}|${unit}|${m}|${n}|${project}`; if (!cache.has(k)) cache.set(k, lean(['--candidate', file, '--unit', unit, '--n', String(n)], m, project)); return cache.get(k); };
// (lane w9au) the workspace fixture, read with the app package's own tsconfig
const app = path.join(fixtures, 'imports', 'packages', 'app'), units = path.join(app, 'src', 'units.ts'), address = path.join(app, 'src', 'address.ts');
const inApp = (unit, m = null, file = units) => run(unit, file, m, 24, path.join(app, 'tsconfig.json'));
const reachReason = (r) => records(r).find((x) => x.kind === 'new:coverage' && x.phase === 'draw')?.reason ?? coverageTest(r)?.reason ?? '';

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
  // (lane w9au) an import the reach could not follow is followed as the repository resolves it (design/w9au-import-follow.md)
  ['reach-resolve', 'an alias of another workspace package\'s own tsconfig is followed (`@lib/tick` from Clock.now): the unit gets a test', (m) => {
    const r = inApp('later', m); const t = proposed(r);
    const ok = !!t && t.check?.passed === t.cases && t.check.world === 0 && !/cannot follow/.test(reachReason(r));
    return { ok, detail: t ? `cases ${t.cases}, check ${JSON.stringify(t.check)}` : reachReason(r) || 'no record' };
  }],
  ['reach-resolve', 'a workspace package is read from its source, named by its manifest\'s build entry (dist/main.js from src/main.ts): what the source reads is seen', (m) => {
    const r = inApp('gauge', m); const why = reachReason(r);
    const ok = /names document \(main\.ts:3\)/.test(why);
    return { ok, detail: why.slice(0, 150) || 'no reason' };
  }],
  ['reach-packages', 'a package the repository declares and the checkout does not install is a package lean fakes (`v7` of uuid, called): the unit gets a test', (m) => {
    const r = inApp('label', m); const t = proposed(r);
    const ok = !!t && t.check?.passed === t.cases && t.check.world === 0 && !/cannot follow/.test(reachReason(r));
    return { ok, detail: t ? `cases ${t.cases}, check ${JSON.stringify(t.check)}` : reachReason(r) || 'no record' };
  }],
  ['reach-builtins', 'a Node builtin read without Node\'s declarations is a world surface lean answers (`isIP` of node:net, called): the unit gets a test', (m) => {
    const r = inApp('hostKind', m); const t = proposed(r);
    const ok = !!t && t.check?.passed === t.cases && t.check.world === 0 && !/cannot follow/.test(reachReason(r));
    return { ok, detail: t ? `cases ${t.cases}, check ${JSON.stringify(t.check)}` : reachReason(r) || 'no record' };
  }],
  ['reach-reason', 'an import still not followed names why (`@/meta/version`: the tsconfig path names no file)', (m) => {
    const r = inApp('bannerText', m); const why = reachReason(r);
    const ok = !proposed(r) && /an import lean cannot follow: `VERSION` \(banner\.ts:5\): the tsconfig path for '@\/meta\/version' names no file/.test(why);
    return { ok, detail: why.slice(0, 160) || 'no reason' };
  }],
  [null, 'a `.js` specifier naming a `.ts` file is followed (TypeScript\'s own resolution): the unit gets a test', () => {
    const r = inApp('quad'); const t = proposed(r);
    const ok = !!t && t.check?.passed === t.cases;
    return { ok, detail: t ? `cases ${t.cases}, check ${JSON.stringify(t.check)}` : reachReason(r) || 'no record' };
  }],
  [null, 'node:net called by the unit is mocked with lean\'s answers', () => {
    const r = inApp('isAddress', null, address); const t = proposed(r); const text = t?.text ?? '';
    const ok = /vi\.mock\("node:net", /.test(text) && /vi\.mocked\(stub_node_net\.isIP\)/.test(text) && t.check?.passed === t.cases && t.check.world === 0;
    return { ok, detail: t ? text.split('\n').filter((l) => /vi\.(?:mock|mocked)\(/.test(l)).map((l) => l.trim()).join(' | ').slice(0, 150) : reachReason(r) || 'no record' };
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
  // (lane w9as) the two lanes in one case: a handed-out function or a callback beside the world's stubs (design/w9as-merge.md)
  ['new-test-drive-stubs', 'a handed-out function that asks the world is called under the stubs of lean\'s answers', (m) => {
    const a = proposed(run('loader', joint, m)), b = proposed(run('since', joint, m)); const ta = a?.text ?? '', tb = b?.text ?? '';
    const ok = !!a && !!b && a.drives?.calls >= 3 && a.world?.stubs >= 3 && /vi\.mock\("node:fs", /.test(ta) && /const out = loader\(/.test(ta) && /out\("[^"]*"\)/.test(ta) && /expect\(stub_node_fs\.readFileSync\)\.toHaveBeenNthCalledWith\(1, /.test(ta) && a.check?.passed === a.cases
      && b.drives?.calls >= 1 && /vi\.setSystemTime\(17\d{11}\);/.test(tb) && /const out = since\(/.test(tb) && /expect\(out\(\)\)\.toEqual\("[^"]*@17\d{11}"\)/.test(tb) && b.check?.passed === b.cases;
    return { ok, detail: `loader: ${a ? `drives ${JSON.stringify(a.drives)}, world ${JSON.stringify(a.world)}, check ${JSON.stringify(a.check)}` : coverageTest(run('loader', joint, m))?.reason ?? 'no record'}; since: ${b ? (tb.split('\n').find((l) => /out\(\)/.test(l)) ?? 'no drive').trim() : coverageTest(run('since', joint, m))?.reason ?? 'no record'}` };
  }],
  ['new-test-callback-stubs', 'a callback called beside a request of the world is a spy, the request a stub', (m) => {
    const t = proposed(run('tagAll', joint, m)); const text = t?.text ?? '';
    const ok = !!t && t.callbacks?.calls >= 1 && t.world?.surfaces.includes('clock') && /const f = vi\.fn\(\)\.mockReturnValueOnce\(/.test(text) && /vi\.setSystemTime\(17\d{11}\);/.test(text) && /expect\(f\)\.toHaveBeenNthCalledWith\(1, /.test(text) && t.check?.passed === t.cases && t.check.world === 0;
    return { ok, detail: t ? `callbacks ${JSON.stringify(t.callbacks)}, world ${JSON.stringify(t.world)}, check ${JSON.stringify(t.check)}` : coverageTest(run('tagAll', joint, m))?.reason ?? 'no record' };
  }],
  [null, 'the node:test dialect spies on a callback beside a hand stub of the clock, restored in finally', () => {
    const t = proposed(run('tagAll', path.join(fixtures, 'node-runner', 'joint.ts'))); const text = t?.text ?? '';
    const ok = !!t && t.dialect === 'node:test' && /const fCalls: unknown\[\]\[\] = \[\];/.test(text) && /Date\.now = \(\.\.\.args\) =>/.test(text) && /\} finally \{ Date\.now = nowStub\.saved; \}/.test(text) && t.check?.passed === t.cases;
    return { ok, detail: t ? `${t.dialect}; ${(text.split('\n').find((l) => /finally/.test(l)) ?? 'no restore').trim()}` : coverageTest(run('tagAll', path.join(fixtures, 'node-runner', 'joint.ts')))?.reason ?? 'no record' };
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
