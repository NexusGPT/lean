// Which pairs the conformance step runs on (design/model-conformance.md "Where it runs"). The step costs hours over every
// pair under load (row d7e54baf), so it runs in full only where it pays, the admission suite:
//   LEAN_PAIRS given        -> those pairs, as the pair step itself;
//   LEAN_CONFORMANCE=full   -> every pair (the admission suite and W/harness/regress.sh set it);
//   neither                 -> the pairs whose files changed since the last commit of the baseline file
//                              (known-findings.json): committed, uncommitted and untracked changes; none when none did.
//                              A translator change since the baseline moves models without moving a pair file: only the
//                              full run sees it, which is why the admission runs in full.
//   LEAN_CONFORMANCE=<else> -> an error: a misspelt switch never selects a rule silently.
// Outside a git work tree (an exported copy) the changed set cannot be read: every pair, and the reason.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const gitOut = (root, args) => {
  const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) return { error: String(r.error.message) };
  if (r.status !== 0) return { error: `git ${args.join(' ')}: exit ${r.status}: ${(r.stderr ?? '').trim().split('\n')[0]}` };
  return { out: r.stdout };
};

export function conformanceSelection({ env = process.env, root, pairsDir, knownFile }) {
  const named = (env.LEAN_PAIRS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (named.length) return { mode: 'named', pairs: named, why: `the LEAN_PAIRS set (${named.length} pairs)` };
  const sw = env.LEAN_CONFORMANCE;
  if (sw !== undefined && sw !== '' && sw !== 'full') throw new Error(`LEAN_CONFORMANCE=${sw}: the one value is "full" (every pair); unset, the step runs the pairs changed since the baseline`);
  if (sw === 'full') return { mode: 'full', pairs: null, why: 'LEAN_CONFORMANCE=full: every pair' };
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const base = gitOut(root, ['log', '-1', '--format=%H', '--', rel(knownFile)]);
  if (base.error || !base.out.trim()) return { mode: 'all', pairs: null, why: `every pair: the baseline commit cannot be read (${base.error ?? `no commit of ${rel(knownFile)}`}; git is needed for the changed set)` };
  const sha = base.out.trim();
  const diff = gitOut(root, ['diff', '--name-only', sha, '--', rel(pairsDir)]);
  const fresh = gitOut(root, ['ls-files', '--others', '--exclude-standard', '--', rel(pairsDir)]);
  if (diff.error || fresh.error) return { mode: 'all', pairs: null, why: `every pair: the changed set cannot be read (${diff.error ?? fresh.error})` };
  const prefix = rel(pairsDir) + '/';
  const names = new Set();
  for (const f of (diff.out + fresh.out).split('\n')) if (f.startsWith(prefix)) names.add(f.slice(prefix.length).split('/')[0]);
  const pairs = [...names].filter((n) => fs.existsSync(path.join(pairsDir, n, 'expect.json'))).sort(); // a deleted pair has nothing to run
  return { mode: 'changed', pairs, sha, why: `the ${pairs.length} pair(s) changed since the baseline commit ${sha.slice(0, 8)}${pairs.length ? `: ${pairs.join(', ')}` : ''} (LEAN_CONFORMANCE=full runs every pair)` };
}
