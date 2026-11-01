#!/usr/bin/env node
// The change ledger of a lean checkout over every first-parent commit of a repository against its parent: where each
// edit of a source file goes (a function, the module unit, the types unit, unassigned by reason, an artifact), so two
// leans (the base of lane w1f-module-units and its head) are compared on the same commits. Read-only on the repository:
// only `git rev-list`, `git diff`, `git cat-file` (buildChangeManifest) run in it.
//
//   node ledger-routes.mjs --lean <langs/ts folder> --repo <root> --out <json> [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const lean = path.resolve(opt('--lean')), repo = path.resolve(opt('--repo')), out = path.resolve(opt('--out')), limit = Number(opt('--limit', 0));
const { buildChangeManifest, routeChanges } = await import(path.join(lean, 'ci/ledger.mjs'));
const git = (args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, LC_ALL: 'C' } }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout; };
let commits = git(['rev-list', '--first-parent', '--parents', 'HEAD']).trim().split('\n').map((l) => l.split(' ')).filter((p) => p.length >= 2);
if (limit) commits = commits.slice(0, limit);
const count = { commits: 0, failed: 0, sourceEdits: 0, kinds: {}, unassigned: {}, units: { function: 0, module: 0, types: 0 }, commitsWith: { module: 0, types: 0, typesOnlyCode: 0 } };
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const t0 = Date.now();
for (const [sha, parent] of commits) {
  let ledger;
  try { ledger = routeChanges(buildChangeManifest({ repo, base: parent, head: sha })); }
  catch (e) { count.failed++; continue; }
  count.commits++;
  const unitIds = { function: new Set(), module: new Set(), types: new Set() };
  for (const e of ledger.edits) {
    if (!/\.[cm]?[jt]sx?$/.test(e.file) || e.class !== 'source') continue;
    count.sourceEdits++;
    inc(count.kinds, e.primary.kind);
    if (e.primary.kind === 'unassigned') inc(count.unassigned, e.primary.reason + (e.primary.inert ? ' (inert)' : ''));
    if (e.primary.kind === 'unit') unitIds[e.primary.unit === '(module)' ? 'module' : e.primary.unit === '(types)' ? 'types' : 'function'].add(e.primary.id);
  }
  for (const k of Object.keys(unitIds)) count.units[k] += unitIds[k].size;
  if (unitIds.module.size) count.commitsWith.module++;
  if (unitIds.types.size) count.commitsWith.types++;
}
count.seconds = Math.round((Date.now() - t0) / 1000);
fs.writeFileSync(out, JSON.stringify({ lean, repo, ...count }, null, 1) + '\n');
console.log(`${path.basename(repo)}: ${count.commits} commits (${count.failed} failed), ${count.sourceEdits} source edits: ${JSON.stringify(count.kinds)}; units ${JSON.stringify(count.units)}; unassigned ${JSON.stringify(count.unassigned)}; ${count.seconds} s`);
