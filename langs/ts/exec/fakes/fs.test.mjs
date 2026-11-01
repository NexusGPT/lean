// The fs fake's protocol against the real fs (design/w2b-node-fakes.md): one stated sequence run on the fake (under
// /app) and on a real temporary folder, the answers compared by value or by Node's error code and syscall. `--break`:
// the recording proxy alone answers, and every protocol fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import realFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BREAK, world, moduleOf, opsSince, outcome, outcomeAsync } from './protocol.mjs';

const tmp = realFs.mkdtempSync(path.join(os.tmpdir(), 'lean-fakefs-'));
test.after(() => realFs.rmSync(tmp, { recursive: true, force: true }));
let n = 0;
// the same sequence on both: `run(fs, at)` gets a module and the path maker of its root
function both(run) {
  const real = path.join(tmp, String(n++));
  const fake = `/app/t${n}`;
  const env = world(n); const fs = moduleOf(env, 'node:fs');
  fs.rmSync(fake, { recursive: true, force: true }); // both roots start absent
  const mine = run(fs, (...p) => path.posix.join(fake, ...p));
  const theirs = run(realFs, (...p) => path.join(real, ...p));
  return { mine, theirs, env };
}
async function bothAsync(run) {
  const real = path.join(tmp, String(n++));
  const fake = `/app/t${n}`;
  const env = world(n); const fs = moduleOf(env, 'node:fs');
  fs.rmSync(fake, { recursive: true, force: true }); // both roots start absent
  return { mine: await run(fs, (...p) => path.posix.join(fake, ...p)), theirs: await run(realFs, (...p) => path.join(real, ...p)), env };
}
const seq = (fs, at) => (steps) => steps.map((s) => outcome(() => s(fs, at)));

test('write-then-read: what was written is read back, as a string and as bytes', () => {
  const { mine, theirs } = both((fs, at) => seq(fs, at)([
    (fs) => fs.mkdirSync(at()),
    (fs) => fs.writeFileSync(at('a.txt'), 'héllo\nworld'),
    (fs) => fs.readFileSync(at('a.txt'), 'utf8'),
    (fs) => fs.readFileSync(at('a.txt')),
    (fs) => fs.writeFileSync(at('a.txt'), Buffer.from([1, 2, 3])),
    (fs) => fs.readFileSync(at('a.txt'), { encoding: 'hex' }),
    (fs) => fs.appendFileSync(at('a.txt'), 'z'),
    (fs) => fs.readFileSync(at('a.txt'), 'latin1'),
    (fs) => fs.statSync(at('a.txt')).size,
    (fs) => fs.statSync(at('a.txt')).isFile(),
  ]));
  assert.deepEqual(mine, theirs);
});

test('enoent-on-missing, eexist-on-mkdir, enotdir, eisdir: Node codes and syscalls', () => {
  const { mine, theirs } = both((fs, at) => seq(fs, at)([
    (fs) => fs.mkdirSync(at()),
    (fs) => fs.writeFileSync(at('f'), 'x'),
    (fs) => fs.unlinkSync(at('f')),
    (fs) => fs.readFileSync(at('f'), 'utf8'),
    (fs) => fs.existsSync(at('f')),
    (fs) => fs.statSync(at('f')),
    (fs) => fs.statSync(at('f'), { throwIfNoEntry: false }),
    (fs) => fs.unlinkSync(at('f')),
    (fs) => fs.mkdirSync(at('d')),
    (fs) => fs.mkdirSync(at('d')),
    (fs) => fs.mkdirSync(at('d'), { recursive: true }),
    (fs) => fs.readFileSync(at('d')),
    (fs) => fs.writeFileSync(at('g'), 'x'),
    (fs) => fs.readdirSync(at('g')),
    (fs) => fs.writeFileSync(at('h', 'i'), 'x'),
    (fs) => fs.mkdirSync(at('p', 'q')),
    (fs) => fs.mkdirSync(at('p', 'q', 'r'), { recursive: true }) === at('p'),
    (fs) => fs.rmdirSync(at('p')),
    (fs) => fs.rmSync(at('nothing'), { force: true }),
    (fs) => fs.rmSync(at('p'), { recursive: true }),
    (fs) => fs.existsSync(at('p', 'q')),
  ]));
  assert.deepEqual(mine, theirs);
});

test('listing, rename and copy: a folder lists what is in it', () => {
  const { mine, theirs } = both((fs, at) => seq(fs, at)([
    (fs) => fs.mkdirSync(at()),
    (fs) => fs.writeFileSync(at('b.json'), '{}'),
    (fs) => fs.writeFileSync(at('a.txt'), 'a'),
    (fs) => fs.mkdirSync(at('sub')),
    (fs) => fs.readdirSync(at()).slice().sort(),
    (fs) => fs.readdirSync(at(), { withFileTypes: true }).map((d) => `${d.name}:${d.isDirectory()}`).sort(),
    (fs) => fs.renameSync(at('a.txt'), at('sub', 'c.txt')),
    (fs) => fs.readFileSync(at('sub', 'c.txt'), 'utf8'),
    (fs) => fs.existsSync(at('a.txt')),
    (fs) => fs.copyFileSync(at('b.json'), at('sub', 'd.json')),
    (fs) => fs.readdirSync(at('sub')).slice().sort(),
    (fs) => fs.renameSync(at('sub'), at('moved')),
    (fs) => fs.readFileSync(at('moved', 'd.json'), 'utf8'),
    (fs) => fs.renameSync(at('none'), at('x')),
  ]));
  assert.deepEqual(mine, theirs);
});

test('the promise and callback forms are the same operations on the same tree', async () => {
  const { mine, theirs } = await bothAsync(async (fs, at) => {
    const out = [];
    out.push(await outcomeAsync(() => fs.promises.mkdir(at('x'), { recursive: true }).then(() => 'made')));
    out.push(await outcomeAsync(() => fs.promises.writeFile(at('x', 'p.txt'), 'promised')));
    out.push(await outcomeAsync(() => fs.promises.readFile(at('x', 'p.txt'), 'utf8')));
    out.push(await outcomeAsync(() => fs.promises.readFile(at('x', 'missing'), 'utf8')));
    out.push(await outcomeAsync(() => new Promise((res, rej) => fs.readFile(at('x', 'p.txt'), 'utf8', (e, v) => (e ? rej(e) : res(v))))));
    out.push(await outcomeAsync(() => new Promise((res, rej) => fs.readFile(at('x', 'gone'), (e, v) => (e ? rej(e) : res(v))))));
    out.push(await outcomeAsync(() => new Promise((res, rej) => fs.writeFile(at('x', 'cb.txt'), 'cb', (e) => (e ? rej(e) : res(fs.readFileSync(at('x', 'cb.txt'), 'utf8')))))));
    out.push(await outcomeAsync(() => fs.promises.readdir(at('x')).then((xs) => xs.slice().sort())));
    return out;
  });
  assert.deepEqual(mine, theirs);
});

test('a file the run never touched is drawn once, by the seed and the path, and kept', () => {
  const answers = (seed) => { const env = world(seed, ['alpha', 'beta']); const fs = moduleOf(env, 'fs'); return Array.from({ length: 12 }, (_, i) => outcome(() => fs.readFileSync(`/app/data/f${i}.txt`, 'utf8'))); };
  const a = answers(3), b = answers(3);
  assert.deepEqual(a, b, 'the same seed draws the same tree');
  assert.ok(a.some((x) => x.error === 'ENOENT') && a.some((x) => typeof x.ok === 'string'), `both a missing and a present file are drawn: ${JSON.stringify(a)}`);
  const env = world(3); const fs = moduleOf(env, 'fs');
  const first = outcome(() => fs.readFileSync('/app/kept.txt', 'utf8'));
  assert.deepEqual(outcome(() => fs.readFileSync('/app/kept.txt', 'utf8')), first, 'a drawn file keeps its answer');
});

test('the trace carries every operation, the paths as the unit wrote them', () => {
  const env = world(9); const fs = moduleOf(env, 'node:fs'); const mark = env.trace.length;
  fs.writeFileSync('/app/t.txt', 'v'); fs.readFileSync('/app/t.txt', 'utf8'); fs.promises.readFile('/app/t.txt');
  assert.deepEqual(opsSince(env, mark), ['get module:node:fs.writeFileSync', 'call module:node:fs.writeFileSync', 'get module:node:fs.readFileSync', 'call module:node:fs.readFileSync', 'get module:node:fs.promises', 'get module:node:fs.promises.readFile', 'call module:node:fs.promises.readFile']);
  assert.deepEqual(env.trace.find((r) => r.path === 'module:node:fs.writeFileSync' && r.op === 'call').args, ['/app/t.txt', 'v']);
});

if (BREAK) test.after(() => console.log('--break: the recording proxy alone answered; every protocol above must have failed'));
