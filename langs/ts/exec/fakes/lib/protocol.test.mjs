#!/usr/bin/env node
// The protocol test of the library fakes (design/w2d-library-rows.md; protocol.mjs states the clauses).
// 1. vector clauses: every clause of protocol.mjs on its generated inputs, run against the fake in a side's sandbox
//    (exec/run.mjs sandbox, the environment lane B runs a unit in), must give the outputs the real package gave
//    (vectors/<lib>.json, recorded by vectors.mjs from the published package, its version named);
// 2. world clauses: what each fake takes from lean's world is lean's world: a clock read is the side's recorded clock,
//    randomness the seeded draw, a timer the virtual clock, a request a trace record; the vscode model's documented
//    contract;
// 3. the vendored files are the manifest's (load.mjs refuses an edited file; checked here for every file).
// Runs under TZ=UTC (the date clauses read local time); a run in another zone starts itself again under UTC.
// --break: LEAN_LIBRARY_FAKES=0, every import the recording proxy as before the lane: the clauses fail (red).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
if (process.env.TZ !== 'UTC' || (BREAK && process.env.LEAN_LIBRARY_FAKES !== '0')) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, TZ: 'UTC', ...(BREAK ? { LEAN_LIBRARY_FAKES: '0' } : {}) } });
  process.exit(r.status ?? 1);
}
const { Environment } = await import('../../fake.mjs');
const { sandbox } = await import('../../run.mjs');
const { LIBS, runLib, responseObservations, VECTOR_CLAUSES } = await import('./protocol.mjs');
const { libraryTypeFake } = await import('./index.mjs');
const { settle, VALIDATE } = await import('./axios.mjs');
const { manifestOf, vendoredText } = await import('./load.mjs');
const { CLOCK_EPOCH } = await import('../../record.mjs');

const side = (seed = 1) => { const env = new Environment(seed); sandbox(env, null); return env; };
const failures = [];
const clause = (name, f) => { try { const r = f(); if (r && typeof r.then === 'function') return r.then(() => true, (e) => { failures.push(`${name}: ${e.message.split('\n')[0]}`); return false; }); return true; } catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); return false; } };
const counts = {};

// 1. vector clauses
for (const lib of LIBS) {
  const vec = JSON.parse(fs.readFileSync(path.join(here, 'vectors', `${lib}.json`), 'utf8'));
  const env = side(1);
  const responseOps = (ops) => { const k = (env.opsSeen = (env.opsSeen ?? 0) + 1); const p = `arg1#${k}`, t = { kind: 'service', name: 'Response', module: 'express', symbolName: 'Response', members: {} }; return responseObservations(libraryTypeFake(env, p, t) ?? env.fake(p, t), ops); };
  const axiosOutcome = async (status, vs) => { const axios = env.module('axios'); const e = settle(axios.AxiosError, { status, config: {}, request: {} }, VALIDATE[vs]); return e ? { message: e.message, code: e.code, status: e.response?.status ?? null } : { ok: status }; };
  let got;
  try { got = await runLib(lib, (s) => env.module(s), { responseOps, axiosOutcome }); } catch (e) { failures.push(`${lib}: ${e.message.split('\n')[0]}`); continue; }
  for (const c of VECTOR_CLAUSES[lib]) {
    const want = vec.outputs[c.clause], have = got[c.clause];
    const bad = want.findIndex((w, i) => JSON.stringify(w) !== JSON.stringify(have[i]));
    (counts[lib] ??= { clauses: 0, cases: 0, version: vec.version }).clauses++; counts[lib].cases += want.length;
    if (bad >= 0) failures.push(`${lib} ${c.clause}: case ${bad} gives ${JSON.stringify(have[bad]).slice(0, 160)}, ${lib}@${vec.version} gives ${JSON.stringify(want[bad]).slice(0, 160)}`);
  }
}

// 2. world clauses
const world = [];
const w = (name, f) => world.push([name, f]);
const clockOf = (env, from) => env.trace.slice(from).filter((t) => t.path === 'Date' || t.path === 'Date.now');
w('dayjs(): one read of the side\'s recorded clock', () => { const env = side(5); const d = env.module('dayjs'); const before = env.trace.length; const v = d().valueOf(); assert.equal(clockOf(env, before).length, 1); assert.equal(v, CLOCK_EPOCH + env.clockMillis); assert.equal(side(5).module('dayjs')().valueOf(), v, 'the same seed reads the same instant'); });
w('luxon DateTime.now(): the side\'s recorded clock', () => { const env = side(5); const L = env.module('luxon'); const before = env.trace.length; const v = L.DateTime.now().toMillis(); assert.ok(clockOf(env, before).length >= 1); assert.equal(v, CLOCK_EPOCH + env.clockMillis); });
w('date-fns formatDistanceToNow: the side\'s recorded clock', () => { const env = side(5); const f = env.module('date-fns'); const before = env.trace.length; f.formatDistanceToNow(new Date(0)); assert.ok(clockOf(env, before).length >= 1); });
w('lodash debounce: one timer on the virtual clock, the last arguments', () => {
  const env = side(2); const _ = env.module('lodash'); const calls = [];
  const d = _.debounce((x) => calls.push(x), 50); d(1); d(2); d(3);
  assert.deepEqual(env.pending.map((p) => [p.op, p.ms]), [['setTimeout', 50]], 'a later call clears the earlier timer');
  const q = env.timers.queue; assert.equal(q.length, 1); env.timers.now = q[0].due; q.shift().fn();
  assert.deepEqual(calls, [3]);
  const t = _.throttle((x) => calls.push(x), 30); t(4); t(5); assert.deepEqual(calls, [3, 4], 'throttle runs the leading call at once');
});
w('lodash _.now(): the unit\'s recorded clock read', () => { const env = side(2); const _ = env.module('lodash'); const before = env.trace.length; const v = _.now(); assert.equal(clockOf(env, before).length, 1); assert.equal(v, CLOCK_EPOCH + env.clockMillis); });
w('lodash random, shuffle, sample: the side\'s seeded generator', () => { const run = (s) => { const _ = side(s).module('lodash'); return JSON.stringify([_.random(0, 1000), _.shuffle([1, 2, 3, 4, 5, 6]), _.sample(['a', 'b', 'c', 'd'])]); }; assert.equal(run(3), run(3)); assert.notEqual(run(3), run(4)); });
w('uuid v4: a recorded, seeded draw', () => {
  const env = side(7); const u = env.module('uuid'); const before = env.trace.length; const a = u.v4(), b = u.v4();
  assert.ok(u.validate(a) && u.version(a) === 4 && a !== b);
  assert.equal(env.trace.slice(before).filter((t) => t.path.startsWith('module:uuid#crypto')).length, 2, 'each identifier is a recorded read of the world');
  const again = side(7).module('uuid'); assert.equal(again.v4(), a, 'the same seed draws the same identifier');
  assert.notEqual(side(8).module('uuid').v4(), a);
  const opt = u.v4({ random: Array.from({ length: 16 }, (_, i) => i) }); assert.equal(opt, '00010203-0405-4607-8809-0a0b0c0d0e0f', 'options.random is uuid\'s own path');
});
w('uuid v1: the recorded clock', () => { const env = side(7); const u = env.module('uuid'); const before = env.trace.length; const v = u.v1(); assert.equal(u.version(v), 1); assert.ok(clockOf(env, before).length >= 1); });
w('axios: one request record per request, whatever the call form', async () => {
  const env = side(11); const ax = env.module('axios');
  const reqs = () => env.trace.filter((t) => t.op === 'call' && t.path === 'module:axios.request').map((t) => JSON.stringify(t.args));
  const settled = (p) => p.then((r) => ({ status: r.status, data: r.data }), (e) => ({ error: e.code, status: e.response?.status ?? null }));
  const a = await settled(ax.get('https://h.io/u', { params: { q: 1 } })), b = await settled(ax({ url: 'https://h.io/u?q=1' })), c = await settled(ax.request({ method: 'GET', url: '/u', baseURL: 'https://h.io', params: { q: 1 } }));
  const r = reqs(); assert.equal(r.length, 3); assert.equal(r[0], r[1]); assert.equal(r[1], r[2]);
  const answered = [a, b, c].filter((x) => x.error !== 'ERR_NETWORK');
  for (const x of answered) assert.deepEqual(JSON.stringify(x), JSON.stringify(answered[0]), 'the same request has the same response (the world\'s table)');
  const post = JSON.parse(env.trace.length && (await settled(ax.post('https://h.io/u', { a: 1 })), reqs().pop()));
  assert.equal(post[0].data, '{"a":1}', 'the body as axios transforms it'); assert.equal(post[0].headers['Content-Type'], 'application/json');
});
w('axios: a status outside validateStatus rejects with the response', async () => {
  let seen = 0;
  for (let s = 1; s < 40 && seen < 2; s++) {
    const env = side(s); const ax = env.module('axios');
    try { const r = await ax.get(`https://h.io/${s}`); assert.ok(r.status >= 200 && r.status < 300); }
    catch (e) { if (e.code === 'ERR_NETWORK') continue; assert.ok(ax.isAxiosError(e)); assert.ok(e.response.status >= 400); assert.equal(e.message, `Request failed with status code ${e.response.status}`); seen++; }
  }
  assert.equal(seen, 2, 'some seed draws a failure status');
});
w('express Request: get(name) is headers[lower case], one read', () => {
  const env = side(3); const t = { kind: 'service', name: 'Request', module: 'express', symbolName: 'Request', members: {} };
  const rq = libraryTypeFake(env, 'arg0', t); assert.ok(rq, 'a Request model');
  const b0 = env.trace.length; const v1 = rq.get('X-Id'); const t1 = env.trace.slice(b0).map((x) => x.path);
  const b1 = env.trace.length; const v2 = rq.headers['x-id']; const t2 = env.trace.slice(b1).map((x) => x.path);
  assert.equal(v1, v2); assert.deepEqual(t1, t2);
});
w('vscode: a message answers one of the items offered, or undefined', async () => {
  const seen = new Set();
  for (let s = 1; s <= 30; s++) { const env = side(s); const v = env.module('vscode'); const before = env.trace.length; seen.add(await v.window.showInformationMessage('Save?', 'Yes', 'No')); assert.equal(env.trace.slice(before).filter((t) => t.path === 'module:vscode.window.showInformationMessage').length, 1); }
  assert.deepEqual([...seen].sort(), ['No', 'Yes', undefined].sort());
});
w('vscode: getConfiguration get(key, default), update then get', async () => {
  const vals = new Set();
  for (let s = 1; s <= 20; s++) { const v = side(s).module('vscode'); const c = v.workspace.getConfiguration('ext'); const x = c.get('width', 80); vals.add(x === 80 ? 'default' : 'world'); assert.equal(c.has('width'), x !== 80 || c.has('width')); await c.update('width', 99); assert.equal(c.get('width', 80), 99); assert.equal(v.workspace.getConfiguration('ext').get('width'), 99); }
  assert.deepEqual([...vals].sort(), ['default', 'world']);
});
w('vscode: EventEmitter, Disposable, a registered command runs', async () => {
  const v = side(1).module('vscode'); const got = [];
  const em = new v.EventEmitter(); const d1 = em.event((x) => got.push(`a${x}`)); em.event((x) => got.push(`b${x}`)); em.fire(1); d1.dispose(); em.fire(2);
  assert.deepEqual(got, ['a1', 'b1', 'b2']);
  let n = 0; const d = new v.Disposable(() => n++); d.dispose(); d.dispose(); assert.equal(n, 1);
  v.commands.registerCommand('ext.go', (x) => x * 2); assert.equal(await v.commands.executeCommand('ext.go', 21), 42);
});
for (const [name, f] of world) await clause(name, f);

// 3. the vendored files are the manifest's
let files = 0;
for (const pkg of fs.readdirSync(path.join(here, 'vendor'))) { const m = manifestOf(pkg); if (!m) continue; for (const rel of Object.keys(m.files)) { clause(`${pkg}/${rel} matches its manifest`, () => vendoredText(pkg, rel)); files++; } }

const summary = Object.entries(counts).map(([lib, c]) => `${lib}@${c.version} ${c.clauses}/${c.cases}`).join(', ');
if (failures.length) { console.log(`library fakes protocol: ${failures.length} failure(s)${BREAK ? ' (--break: the recording proxy)' : ''}\n  ${failures.slice(0, 25).join('\n  ')}`); process.exit(1); }
console.log(`library fakes protocol: ALL PASS: vector clauses ${summary}; ${world.length} world clauses; ${files} vendored files match their manifests`);
