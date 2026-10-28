import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// removeMissing: the head commit deletes the files its side folder lacks (gone.ts); without it a file stays once copied,
// which keeps the six-row fixture the other tests count
export function intakeRepo(out = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intake-')), { removeMissing = false } = {}) {
  fs.mkdirSync(out, { recursive: true });
  if (fs.readdirSync(out).length) throw new Error('Fixture destination must be empty');
  const git = (...args) => {
    const r = spawnSync('git', ['-C', out, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  const commit = (side) => {
    const wanted = new Set(fs.readdirSync(path.join(here, side)));
    if (removeMissing) for (const file of fs.readdirSync(out)) if (file !== '.git' && !wanted.has(file)) fs.rmSync(path.join(out, file), { force: true });
    for (const file of wanted) fs.copyFileSync(path.join(here, side, file), path.join(out, file));
    git('add', '-f', '.');
    git('commit', '-q', '-m', side === 'base' ? 'Read the original units' : 'Read the changed units');
    return git('rev-parse', 'HEAD');
  };
  return { repo: out, base: commit('base'), head: commit('head') };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(intakeRepo(process.argv[2])));
