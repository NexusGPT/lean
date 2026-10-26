#!/usr/bin/env node
// lean census: every TypeScript function of a repository through the gate, the blockers counted.
//   node census.mjs <repo-root> [--out census.json] [--limit N] [--include <glob-ish prefix>]
// Walks .ts/.tsx/.mts under the root (skipping node_modules, dist, build, .next, coverage, tests, stories,
// declarations), lints each file inside its project, and reports: units, units inside the subset, the rule counts
// with three examples each, per package and in total. Read-only: nothing is written into the repository.
import fs from 'node:fs';
import path from 'node:path';
import { lintFile } from './lint/lint.mjs';
import { loadManyChunks, topLevelFunctions, lineOf } from './common.mjs';

const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name)); continue; }
    if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}
function packageOf(root, file) {
  const rel = path.relative(root, file).split(path.sep);
  if ((rel[0] === 'apps' || rel[0] === 'packages' || rel[0] === 'libs' || rel[0] === 'services') && rel.length > 2) return `${rel[0]}/${rel[1]}`;
  return rel[0];
}

export function census(root, opts = {}) {
  const { limit = 0, include = null, log = () => {} } = opts;
  const rules = new Map(); // rule -> {count, units:Set, examples:[]}
  const perPackage = new Map();
  const records = []; // one per file: what the per-file reader needs
  let files = 0, units = 0, entered = 0, failedFiles = 0;
  const t0 = Date.now();
  const list = [];
  for (const file of walk(root)) {
    if (include && !path.relative(root, file).startsWith(include)) continue;
    if (limit && list.length >= limit) break;
    list.push(file);
  }
  // one program per tsconfig (in chunks), every file of the project as a root: the type checker is built once per
  // chunk, not per file, and a chunk is dropped once its files are linted
  for (const loaded of loadManyChunks(list, { log })) for (const abs of loaded.keys()) {
    const file = abs;
    files++;
    const pkg = packageOf(root, file);
    const P = perPackage.get(pkg) ?? { files: 0, units: 0, entered: 0 }; P.files++; perPackage.set(pkg, P);
    let findings, unitNames;
    try {
      const L = loaded.get(path.resolve(file));
      if (!L || L.error) throw new Error(L?.error ?? 'not loaded');
      const { sf } = L;
      unitNames = [...topLevelFunctions(sf).values()].map((u) => [u.name, lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]);
      findings = lintFile(file, null, { project: true, loaded: L });
    } catch (e) { failedFiles++; records.push({ file: path.relative(root, file), pkg, error: String(e.message).slice(0, 200) }); log(`! ${path.relative(root, file)}: ${String(e.message).slice(0, 120)}`); continue; }
    records.push({ file: path.relative(root, file), pkg, units: unitNames.map(([n, a, b]) => ({ name: n, lines: [a, b] })), findings: findings.map((f) => ({ line: f.line, rule: f.rule, msg: f.msg })) });
    const blocked = new Set();
    for (const f of findings) {
      const unit = unitNames.find(([, a, b]) => a <= f.line && f.line <= b)?.[0] ?? null;
      if (unit && !f.env) blocked.add(unit); // an unresolved import is the checkout's, not the code's
      const r = rules.get(f.rule) ?? { count: 0, units: new Set(), examples: [] };
      r.count++; if (unit) r.units.add(`${file}:${unit}`);
      if (r.examples.length < 3) r.examples.push(`${path.relative(root, file)}:${f.line} ${f.msg.slice(0, 110)}`);
      rules.set(f.rule, r);
    }
    units += unitNames.length; entered += unitNames.length - blocked.size;
    P.units += unitNames.length; P.entered += unitNames.length - blocked.size;
    if (files % 50 === 0) log(`${files} files, ${units} units, ${entered} inside, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  const ruleRows = [...rules.entries()].map(([rule, r]) => ({ rule, findings: r.count, units: r.units.size, examples: r.examples })).sort((a, b) => b.units - a.units);
  return { root, files, failedFiles, units, entered, share: units ? Math.round((1000 * entered) / units) / 10 : null, seconds: Math.round((Date.now() - t0) / 1000), rules: ruleRows, records, packages: [...perPackage.entries()].map(([pkg, p]) => ({ pkg, ...p })).sort((a, b) => b.units - a.units) };
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const root = path.resolve(a[0]);
  const res = census(root, { limit: Number(opt('--limit', 0)), include: opt('--include', null), log: (m) => console.error(m) });
  const out = opt('--out', null);
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(`${path.basename(root)}: ${res.files} files, ${res.units} units, ${res.entered} inside the subset (${res.share} percent), ${res.failedFiles} files unreadable, ${res.seconds} s`);
  for (const r of res.rules.slice(0, 25)) console.log(`  ${String(r.units).padStart(6)} units  ${r.rule.padEnd(22)} ${r.examples[0] ?? ''}`);
}
