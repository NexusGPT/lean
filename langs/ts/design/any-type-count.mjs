#!/usr/bin/env node
// The any-type findings over a repository: proposals (with evidence) against flags (conflicting or no evidence), by
// site kind, and the most frequent proposed types. Walks .ts/.tsx/.mts the way census.mjs does, lints each file in its
// project with anyType on. Read-only: nothing is written into the repository.
//   node langs/ts/design/any-type-count.mjs <repo-root> [--out counts.json]
import fs from 'node:fs';
import path from 'node:path';
import { lintFile } from '../lint/lint.mjs';
import { loadManyChunks } from '../common.mjs';

const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name)); continue; }
    if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}
// a finding's class: a proposal with evidence, a conflict, a value the code tests with typeof, or no evidence
const classOf = (f) => (f.proposal ? 'proposal' : f.conflicts ? 'conflict' : f.guarded ? 'typeof-tested' : 'no evidence');

const a = process.argv.slice(2);
const root = path.resolve(a[0]);
const out = a.includes('--out') ? a[a.indexOf('--out') + 1] : null;
const t0 = Date.now();
const files = [...walk(root)];
const byClass = {}, byKind = {}, proposals = new Map(), written = {}, samples = {};
let n = 0, failed = 0, unresolved = 0, linted = 0;
for (const loaded of loadManyChunks(files, { log: (m) => console.error(m) })) for (const [abs, L] of loaded) {
  if (!L || L.error) { failed++; continue; }
  let fs_;
  try { fs_ = lintFile(abs, null, { project: true, loaded: L, anyType: true }); } catch (e) { failed++; console.error(`! ${path.relative(root, abs)}: ${String(e.message).slice(0, 120)}`); continue; }
  linted++;
  for (const f of fs_) {
    if (f.rule === 'unresolved-module') unresolved++;
    if (f.rule !== 'any-type') continue;
    n++;
    const c = classOf(f);
    byClass[c] = (byClass[c] ?? 0) + 1;
    (byKind[f.kind] ??= {})[c] = (byKind[f.kind][c] ?? 0) + 1;
    written[`${f.typed} ${f.how}`] = (written[`${f.typed} ${f.how}`] ?? 0) + 1;
    const sm = (samples[c] ??= []); if (sm.length < 12 && (linted * 7 + n) % 5 === 0) sm.push(`${path.relative(root, abs)}:${f.line} ${f.kind} ${f.name}: ${f.proposal ?? f.msg}`.slice(0, 220));
    if (f.proposal) proposals.set(f.proposal, (proposals.get(f.proposal) ?? 0) + 1);
  }
  if (linted % 200 === 0) console.error(`${linted} files, ${n} any-type findings, ${Math.round((Date.now() - t0) / 1000)} s`);
}
const top = [...proposals.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 10).map(([type, count]) => ({ type, count }));
const res = { root, files: files.length, linted, failed, unresolvedModuleFindings: unresolved, anyType: n, byClass, byKind, byTypedHow: written, top, samples, seconds: Math.round((Date.now() - t0) / 1000) };
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
