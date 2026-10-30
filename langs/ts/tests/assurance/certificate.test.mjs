// What the certificate of `check.mjs` holds and what it never holds, and the run identity of `pr.mjs`, as
// docs/ASSURANCE.md states them. One small pair goes through both lanes once (lane B on 3 inputs, Dafny for lane A).
// LEAN_ASSURANCE_TS names another copy of langs/ts (the red runs point it at a copy with the guard removed).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lean = process.env.LEAN_ASSURANCE_TS ? path.resolve(process.env.LEAN_ASSURANCE_TS) : path.resolve(here, '../..');
const sha16 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
// the words a producer might attach to a change: given beside the files, they must reach nothing lean writes
const words = 'producer-says-' + crypto.randomBytes(8).toString('hex');

let dir, parent, candidate, out, res, text;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-assurance-cert-'));
  parent = path.join(dir, 'parent.ts'); candidate = path.join(dir, 'candidate.ts'); out = path.join(dir, 'verdict.json');
  fs.writeFileSync(parent, 'export function inc(x: number): number { return x + 1; }\n');
  fs.writeFileSync(candidate, 'export function inc(x: number): number { return 1 + x; }\n');
  const r = spawnSync(process.execPath, [path.join(lean, 'check.mjs'), '--parent', parent, '--candidate', candidate, '--unit', 'inc', '--n', '3', '--no-project', '--dafny-seconds', '30', '--out', out, '--message', words, '--description', words], { encoding: 'utf8', env: { ...process.env, LEAN_PRODUCER_NOTE: words } });
  text = (r.stdout ?? '') + (r.stderr ?? '');
  assert.equal(r.status, 0, text);
  res = JSON.parse(fs.readFileSync(out, 'utf8'));
});
after(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

test('certificate: the input files by SHA-256, the bound with its seed, the theorem hash and the Dafny version', () => {
  const c = res.certificate;
  assert.equal(c.parent.sha256, sha16(parent));
  assert.equal(c.candidate.sha256, sha16(candidate));
  assert.equal(c.lanes.B.bound.seed, 1);
  assert.equal(c.lanes.B.bound.n, 3);
  const dafny = spawnSync('dafny', ['--version'], { encoding: 'utf8' });
  assert.equal(dafny.status, 0, 'dafny --version');
  assert.ok(dafny.stdout.trim().length > 0);
  assert.equal(c.lanes.A.dafnyVersion, (dafny.stdout + dafny.stderr).trim());
  assert.match(c.lanes.A.theoremSha256 ?? '', /^[0-9a-f]{16}$/);
  assert.equal(c.lanes.A.timeLimitSeconds, 30);
  assert.equal(res.verdict, 'PASS-proved', `${res.verdict}: ${res.reason ?? ''}`);
});

test('certificate: the tools record holds the Node version, the Dafny version text and the version Z3 reports', () => {
  const t = res.certificate.tools;
  assert.equal(t.node, process.version);
  const dafny = spawnSync('dafny', ['--version'], { encoding: 'utf8' });
  assert.equal(dafny.status, 0, 'dafny --version');
  assert.equal(t.dafny, (dafny.stdout + dafny.stderr).trim());
  assert.equal(t.dafny, res.certificate.lanes.A.dafnyVersion);
  // the Z3 the certificate names is one that answers --version with the text it recorded
  assert.equal(typeof t.z3, 'string', `z3 is null: ${t.z3Source}`);
  assert.match(t.z3, /^Z3 version \d+\.\d+/);
  assert.ok(['bundled beside dafny', 'z3 on PATH'].includes(t.z3Source), t.z3Source);
  const z3 = spawnSync('z3', ['--version'], { encoding: 'utf8' });
  if (t.z3Source === 'z3 on PATH') assert.equal(t.z3, (z3.stdout + z3.stderr).trim());
});

test('certificate: words given beside the files never reach the verdict or the certificate', () => {
  assert.ok(!fs.readFileSync(out, 'utf8').includes(words), 'the words are in the verdict file');
  assert.ok(!text.includes(words), 'the words are on the output');
  const top = ['verdict', 'reason', 'witness', 'certificate'];
  for (const k of Object.keys(res)) assert.ok(top.includes(k), `unexpected verdict field ${k}`);
  const fields = ['tool', 'tools', 'identity', 'unit', 'parent', 'candidate', 'lanes', 'unitTextEqual', 'observation', 'layers', 'library', 'adapter', 'timing'];
  for (const k of Object.keys(res.certificate)) assert.ok(fields.includes(k), `unexpected certificate field ${k}`);
  for (const [k, v] of Object.entries(res.certificate.timing ?? {})) assert.equal(typeof v, 'number', `timing ${k} is not a number of seconds`); // seconds only: no text reaches the certificate through it
});

test('run identity: lean\'s commit, its tables and the Dafny version each change the identity', async () => {
  const { runIdentity } = await import(pathToFileURL(path.join(lean, 'pr.mjs')).href);
  const base = { base: 'a', head: 'b', unitSet: [{ file: 'x.ts', unit: 'f' }], leanVersion: 'c1', libraryTableHash: 'l1', adviceTableHash: 'd1', dafnyVersion: '4.11.0' };
  for (const k of ['leanVersion', 'libraryTableHash', 'adviceTableHash', 'dafnyVersion', 'base', 'head']) assert.notEqual(runIdentity(base), runIdentity({ ...base, [k]: 'changed' }), k);
  assert.equal(runIdentity(base), runIdentity({ ...base }));
});

test('intake: a secret-named file is skipped by its name and its content is never read', async () => {
  const { secretPath, selectUnits } = await import(pathToFileURL(path.join(lean, 'pr.mjs')).href);
  for (const f of ['.env', 'config/.env.production', 'server.pem', 'tls.key', 'id_rsa', 'store.p12', 'store.pfx', 'store.jks']) assert.ok(secretPath(f), f);
  for (const f of ['environment.ts', 'keys.ts', 'src/env.ts']) assert.ok(!secretPath(f), f);
  let reads = 0;
  const change = { file: 'config/.env.local', get units() { reads++; return [{ name: 'x', start: 1, end: 1, findings: [] }]; }, get error() { reads++; return null; }, get binary() { reads++; return false; } };
  const rows = selectUnits([change]);
  assert.deepEqual(rows.map((r) => [r.decision, r.reason]), [['skipped', 'secret-path']]);
  assert.equal(reads, 0, 'the change was read past its name');
});
