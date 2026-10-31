#!/usr/bin/env node
// The ledger census of lane read-module-unit-ledger: the change ledger of one lean checkout (--lean, its
// langs/ts/ci/ledger.mjs) over every first-parent commit of a repository that has its parent (--repo), each commit
// against its parent. Counts every edit's primary route: a function unit, the module unit, an artifact, and each
// unassigned reason. Read-only on the repository: commits only (never the worktree, so git refreshes no index), and
// GIT_OPTIONAL_LOCKS=0. No source text is written: counts, commit ids and paths only.
//
//   node ledger-census.mjs --lean <checkout> --repo <repo> --out <file.json> [--limit n]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const lean = path.resolve(arg('--lean')), repo = path.resolve(arg('--repo')), out = path.resolve(arg('--out'));
const limit = Number(arg('--limit', Infinity));
process.env.GIT_OPTIONAL_LOCKS = '0';
const { buildChangeManifest, routeChanges } = await import(pathToFileURL(path.join(lean, 'langs/ts/ci/ledger.mjs')).href);
const git = (args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, LC_ALL: 'C' } }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: exit ${r.status}: ${r.stderr.trim().split('\n').pop()}`); return r.stdout; };
const commits = git(['rev-list', '--first-parent', 'HEAD']).trim().split('\n').filter(Boolean);
const totals = { commits: 0, failed: 0, edits: 0, unit: 0, moduleUnit: 0, artifact: 0, unassigned: 0, reasons: {} };
const perCommit = [];
const started = Date.now();
for (const c of commits) {
  if (totals.commits >= limit) break;
  if (spawnSync('git', ['-C', repo, 'rev-parse', '--verify', '--quiet', `${c}^{commit}`], { encoding: 'utf8' }).status !== 0) continue;
  const parent = spawnSync('git', ['-C', repo, 'rev-parse', '--verify', '--quiet', `${c}^1^{commit}`], { encoding: 'utf8' });
  if (parent.status !== 0) continue; // the shallow boundary: no parent to compare with
  totals.commits++;
  const row = { commit: c, edits: 0, unit: 0, moduleUnit: 0, artifact: 0, unassigned: 0, moduleLevelUnassigned: 0, moduleFiles: [] };
  try {
    const m = routeChanges(buildChangeManifest({ repo, base: parent.stdout.trim(), head: c }));
    for (const e of m.edits) {
      row.edits++;
      const p = e.primary;
      if (p.kind === 'unit' && p.unit === '(module)') { row.moduleUnit++; if (!row.moduleFiles.includes(e.file)) row.moduleFiles.push(e.file); }
      else if (p.kind === 'unit') row.unit++;
      else if (p.kind === 'artifact') row.artifact++;
      else { row.unassigned++; const key = p.reason + (p.context ? ` (${p.context})` : ''); totals.reasons[key] = (totals.reasons[key] ?? 0) + 1; if (p.reason === 'module-level statement') row.moduleLevelUnassigned++; }
    }
  } catch (e) { row.error = `${e.name}: ${String(e.message).slice(0, 160)}`; totals.failed++; }
  for (const k of ['edits', 'unit', 'moduleUnit', 'artifact', 'unassigned']) totals[k] += row[k];
  perCommit.push(row);
}
totals.seconds = Math.round((Date.now() - started) / 1000);
totals.commitsWithModuleLevelUnassigned = perCommit.filter((r) => r.moduleLevelUnassigned).length;
totals.commitsWithModuleUnit = perCommit.filter((r) => r.moduleUnit).length;
fs.writeFileSync(out, JSON.stringify({ lean, repo, head: git(['rev-parse', 'HEAD']).trim(), totals, perCommit }, null, 1));
console.log(JSON.stringify({ repo: path.basename(repo), lean, ...totals }));
