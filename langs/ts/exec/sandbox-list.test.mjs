// The project's sandbox list (exec/sandbox-list.mjs, design/sandbox-allow-list.md), one test per clause: the file read
// from the parent commit, never the working tree; absent, today's sandbox; read, write, spawn and install each allowed
// and refused, a refusal named as the certificate's row. Lane B runs the probes in its worker: each unit leaves the vm
// context through a host intrinsic and answers what the process let it do; the parent answers "x", so the verdict is a
// WITNESS and its candidate outcome is the probe's answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runPair, workerSandbox } from './run.mjs';
import { loadSandboxList, validateList, applyList, defaultList, useSandboxList } from './sandbox-list.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lean-sandbox-list-')));
const repo = path.join(work, 'repo'), outside = path.join(work, 'outside'), out = path.join(work, 'out');
const git = (...a) => { const r = spawnSync('git', ['-C', repo, '-c', 'user.email=lean@local', '-c', 'user.name=lean', ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const write = (rel, text) => { const p = path.join(repo, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const commitList = (list) => { write('.gate/sandbox.json', JSON.stringify(list, null, 1)); git('add', '-A'); git('commit', '-qm', 'list'); return git('rev-parse', 'HEAD'); };

const probes = {
  readOutside: `fs().readFileSync(${JSON.stringify(path.join(outside, 'data.txt'))}, 'utf8')`,
  readSecret: `fs().readFileSync(${JSON.stringify(path.join(repo, 'secret', 'key.txt'))}, 'utf8')`,
  readOther: `fs().readFileSync(${JSON.stringify(path.join(repo, 'other.txt'))}, 'utf8')`,
  readPinned: `fs().readFileSync(${JSON.stringify(path.join(repo, 'node_modules', 'pinned', 'index.js'))}, 'utf8')`,
  readUnpinned: `fs().readFileSync(${JSON.stringify(path.join(repo, 'node_modules', 'unpinned', 'index.js'))}, 'utf8')`,
  writeOut: `(fs().writeFileSync(${JSON.stringify(path.join(out, 'x.txt'))}, 'w'), 'wrote')`,
  spawnTrue: `'exit ' + host().getBuiltinModule('child_process').spawnSync('true').status`,
};
const candidate = [
  "const host = (): any => (Buffer as any).constructor('return process')();",
  "const fs = (): any => host().getBuiltinModule('fs');",
  ...Object.entries(probes).map(([k, body]) => `export function ${k}(): string { try { return String(${body}); } catch (e: any) { return String(e.code); } }`),
].join('\n') + '\n';
const parent = Object.keys(probes).map((k) => `export function ${k}(): string { return "x"; }`).join('\n') + '\n';

fs.mkdirSync(outside, { recursive: true }); fs.writeFileSync(path.join(outside, 'data.txt'), 'outside');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(repo, { recursive: true }); git('init', '-q');
write('parent.ts', parent); write('candidate.ts', candidate);
write('secret/key.txt', 'secret'); write('other.txt', 'other');
write('node_modules/pinned/index.js', 'pinned'); write('node_modules/unpinned/index.js', 'unpinned');
write('package-lock.json', JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'repo' }, 'node_modules/pinned': { version: '1.0.0' } } }));
write('.gitignore', 'node_modules\n');
git('add', '-A'); git('commit', '-qm', 'probes');
const bare = git('rev-parse', 'HEAD');

// one probe through lane B's worker under the list at `commit`: the probe's answer and the list's entry on the result
async function probe(unit, loaded) {
  const r = await runPair({ parent: path.join(repo, 'parent.ts'), candidate: path.join(repo, 'candidate.ts'), unit, n: 1, sandboxList: loaded });
  const answer = r.witnesses?.[0]?.candidate?.outcome?.returned;
  assert.ok(answer !== undefined, `${unit}: no witness (${r.verdict}: ${r.reason})`);
  return { answer, entry: r.sandboxList, rows: (r.sandboxList?.refused ?? []).map((x) => x.row) };
}

test('absent file: the default, and the worker\'s flags are today\'s', async () => {
  const loaded = loadSandboxList(repo, bare);
  assert.equal(loaded.source.kind, 'default');
  assert.match(loaded.source.reason, /is not in commit/);
  const reads = ['/a', '/b/node_modules'];
  assert.deepEqual(applyList(loaded, reads, ['/w']), { reads, writes: ['/w'], spawn: null, refused: [] });
  const opts = { parent: path.join(repo, 'parent.ts'), candidate: path.join(repo, 'candidate.ts') };
  assert.deepEqual(workerSandbox({ ...opts, sandboxList: loaded }).flags, workerSandbox({ ...opts, sandboxList: defaultList() }).flags);
  assert.ok(!workerSandbox({ ...opts, sandboxList: loaded }).flags.includes('--allow-child-process'));
  const p = await probe('readOutside', loaded);
  assert.equal(p.answer, 'ERR_ACCESS_DENIED');
  assert.equal(p.entry, undefined); // no list, no row: the certificate is today's
  assert.equal((await probe('spawnTrue', loaded)).answer, 'ERR_ACCESS_DENIED');
  assert.equal((await probe('readUnpinned', loaded)).answer, 'unpinned'); // today a package the lockfile does not pin is read
});

test('the list is read from the parent commit, never the working tree', () => {
  const c1 = commitList({ version: 1, read: { allow: ['../outside'] } });
  write('.gate/sandbox.json', JSON.stringify({ version: 1, read: { allow: ['/'] } })); // the change widens its own list, uncommitted
  const at1 = loadSandboxList(repo, c1);
  assert.equal(at1.source.kind, 'commit'); assert.equal(at1.source.commit, c1);
  assert.deepEqual(at1.list.read.allow, ['../outside']);
  const c2 = commitList({ version: 1, read: { allow: ['/'] } }); // and committed: the next change's parent holds it, this one's does not
  assert.deepEqual(loadSandboxList(repo, c1).list.read.allow, ['../outside']);
  assert.deepEqual(loadSandboxList(repo, c2).list.read.allow, ['/']);
  assert.equal(loadSandboxList(repo, bare).source.kind, 'default');
});

test('a list that does not match the schema is refused, naming every wrong field', () => {
  assert.throws(() => validateList({ version: 1, read: { allow: 'x' }, spawn: { permit: [] }, extra: 1 }), /the list has an unknown field extra; read.allow is not a list of names; spawn has an unknown field permit/);
  assert.throws(() => validateList({ process_list: 'some' }), /process_list is "some"/);
  const da = { version: 1, install: { allow: { lockfile: true, packages: ['esbuild'], tools: ['git', 'python3'] }, deny: ['node-ipc', 'curl'] }, process_list: 'real' }; // DA's example reads as it is
  assert.deepEqual(validateList(da).install, da.install);
});

test('read: an allowed path is read; a refused one is named, the rest of its tree still read', async () => {
  const allow = loadSandboxList(repo, commitList({ version: 1, read: { allow: ['../outside'] } }));
  assert.equal((await probe('readOutside', allow)).answer, 'outside');
  const deny = loadSandboxList(repo, commitList({ version: 1, read: { deny: ['secret'] } }));
  const p = await probe('readSecret', deny);
  assert.equal(p.answer, 'ERR_ACCESS_DENIED');
  assert.ok(p.rows.includes(`sandbox: refused read ${path.join(repo, 'secret')} by read.deny`), p.rows.join('; '));
  assert.equal((await probe('readOther', deny)).answer, 'other');
});

test('write: refused by default, allowed by write.allow, refused by write.deny', async () => {
  const none = loadSandboxList(repo, commitList({ version: 1 }));
  assert.equal((await probe('writeOut', none)).answer, 'ERR_ACCESS_DENIED');
  const allow = loadSandboxList(repo, commitList({ version: 1, write: { allow: ['../out'] } }));
  assert.equal((await probe('writeOut', allow)).answer, 'wrote');
  const deny = loadSandboxList(repo, commitList({ version: 1, write: { allow: ['../out'], deny: ['../out'] } }));
  const p = await probe('writeOut', deny);
  assert.equal(p.answer, 'ERR_ACCESS_DENIED');
  assert.ok(p.rows.includes(`sandbox: refused write ${out} by write.deny`), p.rows.join('; '));
});

test('spawn: refused and named with no allow, run when allowed, refused by spawn.deny and install.deny', async () => {
  const none = await probe('spawnTrue', loadSandboxList(repo, commitList({ version: 1 })));
  assert.equal(none.answer, 'ERR_ACCESS_DENIED');
  assert.ok(none.rows.includes('sandbox: refused spawn true by spawn.allow'), none.rows.join('; '));
  assert.equal((await probe('spawnTrue', loadSandboxList(repo, commitList({ version: 1, spawn: { allow: ['true'] } })))).answer, 'exit 0');
  for (const [list, rule] of [[{ spawn: { allow: ['true'], deny: ['true'] } }, 'spawn.deny'], [{ spawn: { allow: ['true'] }, install: { deny: ['true'] } }, 'install.deny']]) {
    const p = await probe('spawnTrue', loadSandboxList(repo, commitList({ version: 1, ...list })));
    assert.equal(p.answer, 'ERR_ACCESS_DENIED');
    assert.ok(p.rows.includes(`sandbox: refused spawn true by ${rule}`), p.rows.join('; '));
  }
});

test('install: a pinned package is given; an unpinned one refused unless named; a denied one refused though pinned', async () => {
  const lock = loadSandboxList(repo, commitList({ version: 1 }));
  assert.equal((await probe('readPinned', lock)).answer, 'pinned');
  const un = await probe('readUnpinned', lock);
  assert.equal(un.answer, 'ERR_ACCESS_DENIED');
  assert.ok(un.rows.includes('sandbox: refused install unpinned by install.allow'), un.rows.join('; '));
  assert.equal((await probe('readUnpinned', loadSandboxList(repo, commitList({ version: 1, install: { allow: { packages: ['unpinned'] } } })))).answer, 'unpinned');
  const denied = await probe('readPinned', loadSandboxList(repo, commitList({ version: 1, install: { deny: ['pinned'] } })));
  assert.equal(denied.answer, 'ERR_ACCESS_DENIED');
  assert.ok(denied.rows.includes('sandbox: refused install pinned by install.deny'), denied.rows.join('; '));
});

test('the certificate carries the list and its rows (check.mjs --sandbox-base)', () => {
  const c = commitList({ version: 1, read: { deny: ['secret'] } });
  const outFile = path.join(work, 'cert.json');
  const r = spawnSync(process.execPath, [path.join(here, '..', 'check.mjs'), '--parent', path.join(repo, 'parent.ts'), '--candidate', path.join(repo, 'candidate.ts'), '--unit', 'readSecret', '--n', '1', '--dafny-seconds', '5', '--sandbox-base', c, '--out', outFile], { encoding: 'utf8' });
  const cert = JSON.parse(fs.readFileSync(outFile, 'utf8')).certificate;
  assert.ok(cert?.sandbox, `no sandbox in the certificate (exit ${r.status}): ${r.stderr.slice(-400)}`);
  assert.equal(cert.sandbox.list.commit, c);
  assert.ok(cert.sandbox.refused.some((x) => x.row === `sandbox: refused read ${path.join(repo, 'secret')} by read.deny`));
  useSandboxList(null);
});

test.after(() => fs.rmSync(work, { recursive: true, force: true }));
