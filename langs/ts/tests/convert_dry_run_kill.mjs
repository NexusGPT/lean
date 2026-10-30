#!/usr/bin/env node
// convert.mjs --dry-run never writes a source file: a dry run is killed mid-round, and the source tree must be
// byte-identical to what it was, with no file added, at every moment the run was watched and after the kill.
// Run: node langs/ts/tests/convert_dry_run_kill.mjs
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const convert = path.join(here, '..', 'convert.mjs');
const fx = path.join(here, 'fixtures', 'convert');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-dry-kill-'));
// two files with sites the converter rewrites: the kill lands while the second is in its rounds
fs.copyFileSync(path.join(fx, 'nested-ternary', 'before.ts'), path.join(repo, 'a.ts'));
fs.copyFileSync(path.join(fx, 'foreach', 'before.ts'), path.join(repo, 'b.ts'));
const git = (...args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };
git('init', '-q'); git('add', '.'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
const snapshot = () => Object.fromEntries(fs.readdirSync(repo).filter((f) => f !== '.git').sort().map((f) => [f, fs.readFileSync(path.join(repo, f))]));
const same = (x, y) => Object.keys(x).join() === Object.keys(y).join() && Object.keys(x).every((k) => x[k].equals(y[k]));
const before = snapshot();
const child = spawn(process.execPath, [convert, repo, '--no-project', '--narrowed', '--dry-run'], { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '', changedMidRun = null, killed = false;
child.stderr.on('data', (d) => { stderr += d; });
child.stdout.on('data', () => {});
const kill = (why) => { if (killed) return; killed = why; child.kill('SIGTERM'); };
const timer = setInterval(() => {
  const now = snapshot();
  if (!same(before, now)) { changedMidRun ??= Object.keys(now).filter((k) => !before[k] || !before[k].equals(now[k])); kill('a source file changed during the run'); }
  else if (/a\.ts: \d+ finding/.test(stderr)) kill('the first file finished; the second is in its rounds');
}, 2);
const deadline = setTimeout(() => kill('deadline: 60 s'), 60000);
child.on('exit', (code, signal) => {
  clearInterval(timer); clearTimeout(deadline);
  const after = snapshot();
  const ok = !changedMidRun && same(before, after) && (signal === 'SIGTERM' || code === 143); // killed, by the signal or by convert's own handler
  console.log(`${ok ? 'ok  ' : 'FAIL'} dry run killed (${killed || 'not killed'}; exit ${code}, signal ${signal})`);
  if (changedMidRun) console.log(`     written during the dry run: ${changedMidRun.join(', ')}`);
  if (!same(before, after)) console.log(`     tree after the kill differs: ${Object.keys(after).filter((k) => !before[k] || !before[k].equals(after[k])).concat(Object.keys(before).filter((k) => !after[k])).join(', ')}`);
  fs.rmSync(repo, { recursive: true, force: true });
  process.exit(ok ? 0 : 1);
});
