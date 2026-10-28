// The execution lane's sandbox and loader, as docs/ASSURANCE.md states them: every global that reaches the outside and
// every import that leaves the package is a recording fake, and a relative import out of the package root is a fake.
// LEAN_ASSURANCE_TS names another copy of langs/ts (the red runs point it at a copy with the guard removed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lean = process.env.LEAN_ASSURANCE_TS ? path.resolve(process.env.LEAN_ASSURANCE_TS) : path.resolve(here, '../..');
const { Environment } = await import(pathToFileURL(path.join(lean, 'exec/fake.mjs')).href);
const { sandbox } = await import(pathToFileURL(path.join(lean, 'exec/run.mjs')).href);

// a package on disk: <tmp>/pkg with a package.json, plus any files given (paths relative to <tmp>)
const tree = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-assurance-'));
  fs.mkdirSync(path.join(dir, 'pkg'));
  fs.writeFileSync(path.join(dir, 'pkg/package.json'), '{}');
  for (const [rel, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); }
  return dir;
};
const isFake = (v) => (typeof v === 'object' || typeof v === 'function') && v !== null && v.__isFake === true;

test('sandbox: fetch is a recording fake and sends nothing', async () => {
  let hits = 0;
  const server = http.createServer((req, res) => { hits++; res.end('real'); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/probe`;
  try {
    const env = new Environment(3);
    const { ctx } = sandbox(env);
    let answer = vm.runInContext(`fetch(${JSON.stringify(url)})`, ctx);
    if (answer && typeof answer.then === 'function') answer = await answer;
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(hits, 0, 'a request reached the local server');
    assert.ok(env.trace.some((x) => x.op === 'call' && x.path === 'global:fetch' && JSON.stringify(x.args).includes(url)), 'the call is on the trace with its argument');
  } finally { await new Promise((r) => server.close(r)); }
});

test('sandbox: a package or built-in import is a recording fake, never the real module', () => {
  const dir = tree({ 'pkg/a.ts': [
    "import { writeFileSync } from 'fs';",
    "import { execSync } from 'node:child_process';",
    'export function touch(p: string) {',
    "  try { writeFileSync(p, 'x'); } catch (e) { /* a seeded fault */ }",
    "  try { execSync('touch ' + p + '.exec'); } catch (e) { /* a seeded fault */ }",
    '  return 1;',
    '}',
  ].join('\n') });
  try {
    const marker = path.join(dir, 'marker');
    const env = new Environment(5);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    exp.__lean_units.touch(marker);
    assert.equal(fs.existsSync(marker), false, 'fs.writeFileSync wrote a real file');
    assert.equal(fs.existsSync(marker + '.exec'), false, 'child_process.execSync ran a real process');
    const calls = env.trace.filter((x) => x.op === 'call').map((x) => x.path);
    assert.ok(calls.some((p) => p.startsWith('module:fs') && p.endsWith('writeFileSync')), `trace: ${calls.join(', ')}`);
    assert.ok(calls.some((p) => p.startsWith('module:node:child_process') && p.endsWith('execSync')), `trace: ${calls.join(', ')}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('sandbox: the host environment never reaches the unit or the trace', () => {
  const secret = 'lean-assurance-' + crypto.randomBytes(12).toString('hex');
  process.env.LEAN_ASSURANCE_SECRET = secret;
  try {
    const env = new Environment(9);
    const { ctx } = sandbox(env);
    const got = vm.runInContext('[process.env.LEAN_ASSURANCE_SECRET, String(process.env.LEAN_ASSURANCE_SECRET), JSON.stringify(Object.keys(process.env))]', ctx);
    for (const v of got) assert.notEqual(v, secret);
    assert.ok(!JSON.stringify(got).includes(secret), 'the value reached the unit');
    assert.ok(!JSON.stringify(env.trace).includes(secret), 'the value reached the trace');
    assert.ok(env.trace.some((x) => x.path.startsWith('module:process.env')), 'the read is on the trace');
  } finally { delete process.env.LEAN_ASSURANCE_SECRET; }
});

test('sandbox: random draws are seeded, the same for the same seed', () => {
  const draw = (seed) => { const env = new Environment(seed); return vm.runInContext('[Math.random(), Math.random(), Math.random()]', sandbox(env).ctx); };
  assert.deepEqual(Array.from(draw(7)), Array.from(draw(7)));
  assert.notDeepEqual(Array.from(draw(7)), Array.from(draw(8)));
});

test('loader: a relative import that leaves the package root is a recording fake', () => {
  const dir = tree({
    'out/y.ts': "export const loaded = 'outside';",
    'pkg/a.ts': "import * as o from '../out/y';\nexport function f() { return o.loaded; }",
  });
  try {
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const v = exp.__lean_units.f();
    assert.notEqual(v, 'outside', 'the file outside the root was loaded');
    assert.ok(isFake(v), 'the import is a fake');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loader: a paths alias that resolves outside the package root is a recording fake', () => {
  const dir = tree({
    'out/y.ts': "export const loaded = 'outside';",
    'pkg/tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@out/*': ['../out/*'] } } }),
    'pkg/a.ts': "import * as o from '@out/y';\nexport function f() { return o.loaded; }",
  });
  try {
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const v = exp.__lean_units.f();
    assert.notEqual(v, 'outside', 'the aliased file outside the root was loaded');
    assert.ok(isFake(v), 'the import is a fake');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loader: a sibling folder that shares the root\'s name prefix is outside the root and is a recording fake', () => {
  const dir = tree({
    'pkg-evil/y.ts': "export const loaded = 'outside';",
    'pkg/in.ts': "export const loaded = 'inside';",
    'pkg/a.ts': "import * as o from '../pkg-evil/y';\nimport * as i from './in';\nexport function f() { return [o.loaded, i.loaded]; }",
  });
  try {
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const [out, inside] = exp.__lean_units.f();
    assert.notEqual(out, 'outside', 'the sibling folder pkg-evil was loaded as if it were inside pkg');
    assert.ok(isFake(out), 'the import is a fake');
    assert.equal(inside, 'inside', 'a file inside the root still loads');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loader: a symbolic link inside the root that points outside it is a recording fake', () => {
  const dir = tree({
    'out/y.ts': "export const loaded = 'outside';",
    'pkg/in.ts': "export const loaded = 'inside';",
    'pkg/a.ts': "import * as o from './link';\nimport * as i from './alias';\nexport function f() { return [o.loaded, i.loaded]; }",
  });
  try {
    fs.symlinkSync(path.join(dir, 'out/y.ts'), path.join(dir, 'pkg/link.ts'));
    fs.symlinkSync(path.join(dir, 'pkg/in.ts'), path.join(dir, 'pkg/alias.ts'));
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const [out, inside] = exp.__lean_units.f();
    assert.notEqual(out, 'outside', 'the file behind the link was loaded');
    assert.ok(isFake(out), 'the import is a fake');
    assert.equal(inside, 'inside', 'a link that stays inside the root still loads');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loader: a relative .json file outside the package root is a recording fake, never read', () => {
  const dir = tree({
    'out/data.json': JSON.stringify({ secret: 'outside' }),
    'pkg/data.json': JSON.stringify({ secret: 'inside' }),
    'pkg/a.ts': "import * as o from '../out/data.json';\nimport * as i from './data.json';\nexport function f() { return [o.secret, i.secret]; }",
  });
  try {
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const [out, inside] = exp.__lean_units.f();
    assert.notEqual(out, 'outside', 'the .json outside the root was read');
    assert.ok(isFake(out), 'the import is a fake');
    assert.equal(inside, 'inside', 'a .json inside the root is still read');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('loader: an asset import is a fake module, never read', () => {
  const dir = tree({
    'pkg/style.css': '.a { color: red }',
    'pkg/a.ts': "import styles from './style.css';\nexport function f() { return styles; }",
  });
  try {
    const env = new Environment(1);
    const exp = sandbox(env, path.join(dir, 'pkg')).load(path.join(dir, 'pkg/a.ts'));
    const v = exp.__lean_units.f();
    assert.ok(isFake(v), 'the asset import is not a fake');
    assert.ok(!JSON.stringify(env.trace).includes('color: red'), 'the asset content reached the trace');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('fakes: one seed and one path give one answer, faults are seeded, and past 20000 requests the run stops', () => {
  const answers = (seed) => { const env = new Environment(seed); const out = []; for (let i = 0; i < 40; i++) { const f = env.fake(`module:svc.op${i}`); try { out.push(JSON.stringify(f(i)?.__fakePath ?? null)); } catch (e) { out.push('fault:' + e.message); } } return out; };
  const a = answers(11), b = answers(11);
  assert.deepEqual(a, b);
  assert.ok(a.some((x) => x.startsWith('fault:')), 'no call faulted in 40');
  assert.ok(a.some((x) => !x.startsWith('fault:')), 'every call faulted');
  const env = new Environment(1);
  assert.throws(() => { for (let i = 0; i <= 20000; i++) env.record('get', `x.${i}`); }, /more than 20000 environment operations/);
});
