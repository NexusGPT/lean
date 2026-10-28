#!/usr/bin/env node
// The any-type findings over a repository: proposals (with evidence) against flags (conflicting or no evidence), by
// site kind, by label (conditional, migration, flag-only) and by proposal kind (record, primitive, other), the most
// frequent proposed types, the declarations another finding owns (by reason), and the gaps: every declaration typed
// any (or unknown, outside an interface or type-literal field) found by an independent walk that carries neither a
// finding nor a named owner. Walks .ts/.tsx/.mts the way census.mjs does, lints each file in its project with anyType
// on. Read-only: nothing is written into the repository.
//   node langs/ts/design/any-type-count.mjs <repo-root> [--out counts.json]
import fs from 'node:fs';
import path from 'node:path';
import { lintFile } from '../lint/lint.mjs';
import { ts, loadManyChunks, lineOf, colOf } from '../common.mjs';

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
const byClass = {}, byKind = {}, proposals = new Map(), written = {}, samples = {}, byLabel = {}, byProposalKind = {}, owned = {}, gaps = {}, gapSamples = [];
// the independent walk: every parameter, local, bound name and field whose own type is any or unknown (a field of an
// interface or type literal only when any); `this` is not a declared value
const TF = ts.TypeFlags;
function anyDecls(sf, checker) {
  const out = [];
  const w = (n) => {
    let kind = null;
    if (ts.isParameter(n) && !(ts.isIdentifier(n.name) && n.name.text === 'this')) kind = 'parameter';
    else if (ts.isVariableDeclaration(n)) kind = n.parent && ts.isCatchClause(n.parent) ? 'catch' : 'local';
    else if (ts.isBindingElement(n)) kind = 'binding';
    else if ((ts.isPropertyDeclaration(n) || ts.isPropertySignature(n)) && n.name && !ts.isComputedPropertyName(n.name)) kind = ts.isPropertySignature(n) ? 'member' : 'field';
    if (kind && n.name) {
      let t = null; try { t = checker.getTypeAtLocation(n.name); } catch { t = null; }
      if (t && t.flags & (TF.Any | TF.Unknown) && !(kind === 'member' && !(t.flags & TF.Any))) {
        const at = n.name.getStart(sf);
        // a bound name is covered by a finding at any pattern it belongs to (the pattern's proposal is a record of it)
        const cover = [];
        for (let p = n.parent; p && (ts.isObjectBindingPattern(p) || ts.isArrayBindingPattern(p) || ts.isBindingElement(p) || ts.isVariableDeclaration(p) || ts.isParameter(p)); p = p.parent) {
          if (p.name && (ts.isObjectBindingPattern(p.name) || ts.isArrayBindingPattern(p.name))) { const q = p.name.getStart(sf); cover.push(`${lineOf(sf, q)}:${colOf(sf, q)}`); }
        }
        out.push({ kind, line: lineOf(sf, at), col: colOf(sf, at), name: n.name.getText(sf).slice(0, 40), cover });
      }
    }
    ts.forEachChild(n, w);
  };
  w(sf);
  return out;
}
let n = 0, failed = 0, unresolved = 0, linted = 0, ruleFailures = 0;
for (const loaded of loadManyChunks(files, { log: (m) => console.error(m) })) for (const [abs, L] of loaded) {
  if (!L || L.error) { failed++; continue; }
  let fs_; const skipped = [];
  try { fs_ = lintFile(abs, null, { project: true, loaded: L, anyType: true, anyTypeSkipped: skipped }); } catch (e) { failed++; console.error(`! ${path.relative(root, abs)}: ${String(e.message).slice(0, 120)}`); continue; }
  linted++;
  for (const f of fs_) {
    if (f.rule === 'unresolved-module') unresolved++;
    if (f.rule !== 'any-type') continue;
    if (/^any-type could not read/.test(f.msg)) { ruleFailures++; console.error(`! any-type ${path.relative(root, abs)}: ${f.msg}`); continue; }
    n++;
    const c = classOf(f);
    byClass[c] = (byClass[c] ?? 0) + 1;
    (byKind[f.kind] ??= {})[c] = (byKind[f.kind][c] ?? 0) + 1;
    written[`${f.typed} ${f.how}`] = (written[`${f.typed} ${f.how}`] ?? 0) + 1;
    const sm = (samples[c] ??= []); if (sm.length < 12 && (linted * 7 + n) % 5 === 0) sm.push(`${path.relative(root, abs)}:${f.line} ${f.kind} ${f.name}: ${f.proposal ?? f.msg}`.slice(0, 220));
    if (f.proposal) proposals.set(f.proposal, (proposals.get(f.proposal) ?? 0) + 1);
    byLabel[f.label] = (byLabel[f.label] ?? 0) + 1;
    if (f.proposalKind) byProposalKind[f.proposalKind] = (byProposalKind[f.proposalKind] ?? 0) + 1;
  }
  for (const x of skipped) owned[x.reason] = (owned[x.reason] ?? 0) + 1;
  const marked = new Set([...fs_.filter((f) => f.rule === 'any-type').map((f) => `${f.line}:${f.col}`), ...skipped.map((x) => `${x.line}:${x.col}`)]);
  for (const d of anyDecls(L.sf, L.checker)) if (!marked.has(`${d.line}:${d.col}`) && !d.cover.some((k) => marked.has(k))) { gaps[d.kind] = (gaps[d.kind] ?? 0) + 1; if (gapSamples.length < 20) gapSamples.push(`${path.relative(root, abs)}:${d.line}:${d.col} ${d.kind} ${d.name}`); }
  if (linted % 200 === 0) console.error(`${linted} files, ${n} any-type findings, ${Math.round((Date.now() - t0) / 1000)} s`);
}
const top = [...proposals.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 10).map(([type, count]) => ({ type, count }));
const proposalsN = byLabel.conditional ?? 0, flagsN = n - proposalsN;
const res = { root, files: files.length, linted, failed, ruleFailures, unresolvedModuleFindings: unresolved, anyType: n, proposals: proposalsN, flags: flagsN, byLabel, byProposalKind, ownedElsewhere: owned, gaps, gapSamples, byClass, byKind, byTypedHow: written, top, samples, seconds: Math.round((Date.now() - t0) / 1000) };
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
console.log(`any-type: ${n} declarations reported, ${proposalsN} proposals (${byProposalKind.record ?? 0} record, ${byProposalKind.primitive ?? 0} primitive, ${byProposalKind.other ?? 0} other) against ${flagsN} flags (${byLabel['flag-only'] ?? 0} flag-only, ${byLabel.migration ?? 0} migration); owned by another finding ${Object.values(owned).reduce((a, b) => a + b, 0)}; gaps ${Object.values(gaps).reduce((a, b) => a + b, 0)}`);
