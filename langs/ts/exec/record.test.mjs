import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Environment } from './fake.mjs';
import { captureEnvironment, snapshot, witnessRecord } from './record.mjs';

test('capture preserves answers, throws, clock, rng and the original trace', () => {
  function exercise(env, capture) {
    if (capture) captureEnvironment(env);
    const x = env.fake('arg0', { kind: 'service', members: { foo: { kind: 'method', returns: { kind: 'number' } } } });
    const args = capture ? snapshot(env, [x, -0]) : null;
    const result = [];
    for (let k = 0; k < 20; k++) { try { result.push(x.foo(k)); } catch (e) { result.push(e.message); } }
    result.push(Number(x), env.clock('Date.now'), env.clock('Date.now'), env.rng(), env.rng());
    return { env, args, result: result.map(x => x?.__isFake ? x.__fakePath : x), trace: JSON.stringify(env.trace) };
  }
  const a = exercise(new Environment(17), false), b = exercise(new Environment(17), true);
  assert.deepEqual(b.result, a.result); assert.equal(b.trace, a.trace);
  const r = witnessRecord({ seed: 1, leanHead: 'test-head', input: 0, sides: { parent: b, candidate: b } });
  assert.equal(r.schema, 'witness-record/v2');
  assert.equal(r.sides.parent.clock.length, 2);
  assert.equal(r.sides.parent.random.length, 2);
  assert.equal(r.sides.parent.events.filter(e => e.op === 'call').length, 20);
  assert.ok(r.sides.parent.events.some(e => e.outcome?.kind === 'throw'));
  assert.doesNotThrow(() => JSON.stringify(r));
});

test('captures load answers before the v1 trace is cleared and keeps cycles', () => {
  const env = new Environment(1); captureEnvironment(env); env.loading = true;
  env.module('port').ready(); env.loading = false; env.trace.length = 0;
  const a = {}; a.self = a;
  const args = snapshot(env, [a, a]);
  const r = witnessRecord({ seed: 1, leanHead: 'head', input: 0, sides: { parent: { env, args }, candidate: { env, args } } });
  assert.ok(r.sides.parent.events.some(e => e.phase === 'load'));
  assert.ok(r.sides.parent.imports.includes('port'));
  assert.equal(r.sides.parent.args.v[1].t, 'ref');
});

test('runPair emits a separate v2 record including the head and drawn input', async () => {
  const { runPair } = await import('./run.mjs');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-record-test-'));
  try {
    fs.writeFileSync(path.join(d, 'parent.ts'), 'export function f(x: number) { return Date.now() + Math.random() + x; }');
    fs.writeFileSync(path.join(d, 'candidate.ts'), 'export function f(x: number) { return Date.now() + Math.random() + x + 1; }');
    const r = await runPair({ parent: path.join(d, 'parent.ts'), candidate: path.join(d, 'candidate.ts'), unit: 'f', project: false, n: 1 });
    assert.equal(r.verdict, 'WITNESS');
    assert.equal(r.witnesses[0].record?.schema, 'witness-record/v2');
    assert.match(r.witnesses[0].record.leanHead, /^[a-f0-9]{40}$/);
    assert.equal(r.witnesses[0].record.sides.parent.clock.length, 1);
    assert.equal(r.witnesses[0].record.sides.parent.random.length, 1);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('pr report passes the same v2 record through the checked row', async () => {
  const { prReport, reportJSON } = await import('../pr.mjs');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path'); const { spawnSync } = await import('node:child_process');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-report-test-'));
  const git = (...args) => { const r = spawnSync('git', ['-C', d, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  try {
    git('init'); git('config', 'user.name', 'record test'); git('config', 'user.email', 'test@example.invalid');
    fs.writeFileSync(path.join(d, 'a.ts'), 'export function f(x: number) { return x; }'); git('add', 'a.ts'); git('commit', '-m', 'before');
    fs.writeFileSync(path.join(d, 'a.ts'), 'export function f(x: number) { return x + 1; }');
    const rows = await prReport({ repo: d, base: 'HEAD', project: false, n: 1, dafnySeconds: 1, fresh: true });
    const row = reportJSON(rows).rows.find(r => r.unit === 'f');
    assert.equal(row.verdict, 'WITNESS');
    assert.equal(row.witness.record?.schema, 'witness-record/v2');
    assert.deepEqual(JSON.parse(JSON.stringify(reportJSON(rows))).rows.find(r => r.unit === 'f').witness.record, row.witness.record);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('PASS-bounded carries every draw, per-parameter generator counts and explicit reach status', async () => {
  const { runPair } = await import('./run.mjs'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bounded-record-test-'));
  try {
    for (const side of ['parent', 'candidate']) fs.writeFileSync(path.join(d, side + '.ts'), 'export function f(x: number) { return x + Date.now(); }');
    const r = await runPair({ parent: path.join(d, 'parent.ts'), candidate: path.join(d, 'candidate.ts'), unit: 'f', project: false, n: 3 });
    assert.equal(r.verdict, 'PASS-bounded');
    assert.equal(r.bound.record?.schema, 'witness-record/v2');
    assert.equal(r.bound.record.draws.length, 3);
    assert.equal(r.bound.record.drawDomain.parameters[0].count, 3);
    assert.equal(r.bound.record.reach.status, 'not recorded');
    assert.ok(r.bound.record.draws.every(d => d.sides.parent.clock.length === 1));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('lane-A-refused PR rows retain the bounded lane B certificate', async () => {
  const { prReport } = await import('../pr.mjs');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path'); const { spawnSync } = await import('node:child_process');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'refused-record-test-'));
  const git = (...args) => { const r = spawnSync('git', ['-C', d, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
  try {
    git('init'); git('config', 'user.name', 'test'); git('config', 'user.email', 'test@example.invalid');
    fs.writeFileSync(path.join(d, 'a.ts'), 'export function f(x: number) { var y = x; return y; }'); git('add', '.'); git('commit', '-m', 'before');
    fs.writeFileSync(path.join(d, 'a.ts'), 'export function f(x: number) { var y = x; return y * 1; }');
    const r = (await prReport({ repo: d, base: 'HEAD', project: false, n: 3, dafnySeconds: 1, fresh: true })).find(r => r.unit === 'f');
    assert.match(r.coverage, /^refused:/); assert.equal(r.laneB, 'PASS-bounded');
    assert.equal(r.certificate?.lanes.B.record.schema, 'witness-record/v2');
    assert.equal(r.certificate.lanes.B.record.drawDomain.parameters[0].count, 3);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('method programs carry constructor inputs and every command snapshot', async () => {
  const { runPair } = await import('./run.mjs'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'program-record-test-'));
  try {
    const src = 'export class C { n: number; constructor(x: number) { this.n = x; } step(x: number) { this.n += x; return this.n; } }';
    fs.writeFileSync(path.join(d, 'parent.ts'), src); fs.writeFileSync(path.join(d, 'candidate.ts'), src.replace('this.n += x', 'this.n += x + 1'));
    const r = await runPair({ parent: path.join(d, 'parent.ts'), candidate: path.join(d, 'candidate.ts'), unit: 'C.step', project: false, n: 1 });
    assert.equal(r.verdict, 'WITNESS'); const w = r.witnesses[0]; assert.match(w.input, /^program /);
    assert.equal(w.record.invocation.kind, 'program');
    assert.equal(w.record.sides.parent.commands.length, w.program.length);
    assert.equal(w.record.sides.parent.args.t, 'array');
    assert.ok(r.record.programRuns.some(p => JSON.stringify(p) === JSON.stringify(w.record)));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('capture never invokes user accessors or proxy traps', () => {
  const env = new Environment(1); captureEnvironment(env); let hits = 0;
  const value = { get [Symbol.toStringTag]() { hits++; return 'Object'; } };
  const proxy = new Proxy({}, { get() { hits++; return 1; }, ownKeys() { hits++; return []; } });
  snapshot(env, [value, proxy]);
  assert.equal(hits, 0);
});

test('a worker stopped at its bound retains an explicit incomplete unit record', async () => {
  const { runPair } = await import('./run.mjs'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'stopped-record-test-'));
  try {
    for (const side of ['parent','candidate']) fs.writeFileSync(path.join(d, side + '.ts'), 'export function f() { while (true) {} }');
    const r = await runPair({ parent: path.join(d,'parent.ts'), candidate: path.join(d,'candidate.ts'), unit: 'f', unitSeconds: 0.01, project: false });
    assert.equal(r.kind, 'spin-bound'); assert.equal(r.record?.version, 2); assert.equal(r.record.drawDomain.status, 'not recorded');
  } finally { fs.rmSync(d,{recursive:true,force:true}); }
});
