#!/usr/bin/env node
// a two-commit repository made of pair tests: the first commit holds every named pair's parent, the second its
// candidate, each at <pair>/index.ts (or .tsx) beside the pair's sibling modules, so the pull-request table between
// the two commits is the pairs' own change set. lean's self workflow runs the comment on it.
//
//   node pairs-repo.mjs --out <empty dir> [--pairs a,b] [--pairs-root <dir>]
//
// It prints `base=<sha>` and `head=<sha>`, one per line, for a CI step's output file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = path.join(here, '..', 'tests', 'pairs');

const git = (repo, args) => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`);
  return r.stdout.trim();
};

// the side's main file of a pair: parent.ts or parent.tsx
const sideFile = (dir, side) => ['ts', 'tsx'].map((x) => path.join(dir, `${side}.${x}`)).find((p) => fs.existsSync(p)) ?? null;

export function pairsRepo({ out, pairs = null, pairsRoot = PAIRS }) {
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} is not empty`);
  fs.mkdirSync(out, { recursive: true });
  const names = (pairs ?? fs.readdirSync(pairsRoot)).filter((n) => sideFile(path.join(pairsRoot, n), 'parent') && sideFile(path.join(pairsRoot, n), 'candidate'));
  if (!names.length) throw new Error('no pair with a parent and a candidate');
  git(out, ['init', '-q', '-b', 'main']);
  const commit = (side) => {
    for (const n of names) {
      const src = path.join(pairsRoot, n), dst = path.join(out, n);
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) {
        if (/^(parent|candidate)\.tsx?$/.test(f) || f === 'expect.json' || !fs.statSync(path.join(src, f)).isFile()) continue;
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
      const main = sideFile(src, side);
      fs.writeFileSync(path.join(dst, `index${path.extname(main)}`), fs.readFileSync(main));
    }
    git(out, ['add', '-A']);
    git(out, ['commit', '-q', '-m', `pairs: ${side}`]);
    return git(out, ['rev-parse', 'HEAD']);
  };
  return { base: commit('parent'), head: commit('candidate'), pairs: names };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (!opt('--out')) { console.error('usage: pairs-repo.mjs --out <empty dir> [--pairs a,b] [--pairs-root <dir>]'); process.exit(2); }
  const pairs = opt('--pairs') ? opt('--pairs').split(/[,\s]+/).filter(Boolean) : null;
  const r = pairsRepo({ out: path.resolve(opt('--out')), pairs, pairsRoot: path.resolve(opt('--pairs-root', PAIRS)) });
  console.log(`base=${r.base}\nhead=${r.head}\npairs=${r.pairs.join(',')}`);
}
