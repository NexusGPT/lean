#!/usr/bin/env node
// lean census: every TypeScript function of a repository through the gate, the blockers counted.
//   node census.mjs <repo-root> [--out census.json] [--report census.md] [--readings-report readings.md] [--depth N] [--limit N] [--include <prefix>]
//   node census.mjs --diff <before.json> <after.json>     gains and losses per reading between two runs
// Walks .ts/.tsx/.mts under the root (skipping node_modules, dist, build, .next, coverage, tests, stories,
// declarations), lints each file inside its project, and reports: units, units inside the subset, the rule counts
// with three examples each, per package and in total. Read-only: nothing is written into the repository.
import fs from 'node:fs';
import path from 'node:path';
import { lowerFile } from './lower.mjs'; // the lowering's record: the lint's findings and, per unit, its readings and its refusal (design/admission-contract.md)
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
  const { limit = 0, include = null, depth = 2, log = () => {} } = opts;
  if (!Number.isSafeInteger(depth) || depth < 0) throw new Error('depth must be a nonnegative integer');
  const refusalGroups = new Map();
  const date = new Date().toISOString().slice(0, 10);
  const rules = new Map(); // rule -> {count, units:Set, examples:[]}
  const readings = new Map(); // reading id -> { admitted: units admitted that use it, refused: units it refuses }
  const reading = (id) => { if (!readings.has(id)) readings.set(id, { id, admitted: 0, refused: 0 }); return readings.get(id); };
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
    let findings, unitNames, sourceLines, lowered;
    try {
      const L = loaded.get(path.resolve(file));
      if (!L || L.error) throw new Error(L?.error ?? 'not loaded');
      const { sf } = L;
      sourceLines = sf.text.split(/\r?\n/);
      unitNames = [...topLevelFunctions(sf).values()].map((u) => [u.name, lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]);
      const rec = lowerFile(file, null, { project: true, loaded: L }); findings = rec.findings;
      lowered = rec.units.map((u) => ({ unit: u.unit, readings: u.readings.map((r) => r.id), refusal: u.refusal ? u.refusal.id : null }));
      for (const u of rec.units) { if (u.refusal) reading(u.refusal.id).refused++; else for (const r of u.readings) reading(r.id).admitted++; }
    } catch (e) { failedFiles++; records.push({ file: path.relative(root, file), pkg, error: String(e.message).slice(0, 200) }); log(`! ${path.relative(root, file)}: ${String(e.message).slice(0, 120)}`); continue; }
    records.push({ file: path.relative(root, file), pkg, units: unitNames.map(([n, a, b]) => ({ name: n, lines: [a, b] })), lowering: lowered, findings: findings.map((f) => ({ line: f.line, rule: f.rule, msg: f.msg, env: !!f.env })) });
    const blocked = new Set();
    for (const f of findings) {
      const unit = unitNames.find(([, a, b]) => a <= f.line && f.line <= b)?.[0] ?? null;
      if (unit && !f.env && !blocked.has(unit)) {
        // Count each stopped unit under its first refusal. Environment findings do not stop a unit.
        blocked.add(unit);
        const relative = path.relative(root, file).split(path.sep).join('/');
        const directory = relative.split('/').slice(0, -1).slice(0, depth).join('/') || '.';
        const r = refusalGroups.get(f.rule) ?? { rule: f.rule, units: 0, directories: new Map() };
        r.units++;
        const d = r.directories.get(directory) ?? {
          directory, units: 0,
          example: { file: relative, line: f.line, code: (f.text ?? sourceLines[f.line - 1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) },
        };
        d.units++;
        r.directories.set(directory, d);
        refusalGroups.set(f.rule, r);
      }
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
  const refusalRules = [...refusalGroups.values()].map((r) => ({
    rule: r.rule, units: r.units,
    directories: [...r.directories.values()].sort((a, b) => a.directory.localeCompare(b.directory)),
  })).sort((a, b) => b.units - a.units || a.rule.localeCompare(b.rule));
  return { root, date, depth, refused: units - entered, refusalRules, readings: [...readings.values()].sort((a, b) => a.id.localeCompare(b.id)), files, failedFiles, units, entered, share: units ? Math.round((1000 * entered) / units) / 10 : null, seconds: Math.round((Date.now() - t0) / 1000), rules: ruleRows, records, packages: [...perPackage.entries()].map(([pkg, p]) => ({ pkg, ...p })).sort((a, b) => b.units - a.units) };
}

// Render only the saved census result. No files are read and no units are linted here.
export function censusReport(res) {
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;');
  const code = (s) => `<code>${escape(s)}</code>`;
  const lines = [
    `# Census: ${code(path.basename(res.root))}`, '',
    `Date: ${res.date} (UTC)`, '',
    `Units: ${res.units}. Inside the subset: ${res.entered} (${res.share ?? 'n/a'} percent). Refused: ${res.refused}. Files unreadable: ${res.failedFiles}.`, '',
    'Each refused unit is counted once, under the first rule the lint names for it. Environment findings do not refuse units.', '',
    `Directory depth: ${res.depth}. A dot means the repository root.`, '',
    '## Top five rules by units stopped', '',
    '| Rule | Units stopped |', '| --- | ---: |',
    ...res.refusalRules.slice(0, 5).map((r) => `| ${code(r.rule)} | ${r.units} |`), '',
  ];
  if (!res.refusalRules.length) lines.push('No units were refused.', '');
  for (const r of res.refusalRules) {
    lines.push(`## Rule: ${code(r.rule)}`, '', `Units stopped: ${r.units}.`, '',
      '| Directory | Units stopped | Example |', '| --- | ---: | --- |');
    for (const d of r.directories) {
      const e = d.example;
      lines.push(`| ${code(d.directory)} | ${d.units} | ${code(`${e.file}:${e.line}  ${e.code}`)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// The census per reading: a table of every reading with the units admitted that use it and the units it refuses.
export function censusReadingsReport(res) {
  const lines = ['| Reading | Admitted units using it | Units it refuses |', '| --- | ---: | ---: |'];
  for (const r of res.readings ?? []) lines.push(`| \`${r.id}\` | ${r.admitted} | ${r.refused} |`);
  return lines.join('\n');
}
// Two census runs side by side, per reading: the admitted and refused counts in each, and the units that moved. A unit is
// keyed by its file and its name; it is admitted (using its readings) or refused (by one reading). A gain of a reading is
// a unit admitted in the second run that uses it and was refused (or absent) in the first; a loss the converse.
export function censusDiff(a, b) {
  const state = (res) => { const m = new Map(); for (const rec of res.records ?? []) for (const u of rec.lowering ?? []) m.set(`${rec.file}:${u.unit}`, u); return m; };
  const A = state(a), B = state(b);
  const ids = [...new Set([...(a.readings ?? []), ...(b.readings ?? [])].map((r) => r.id))].sort();
  const count = (res, id) => (res.readings ?? []).find((r) => r.id === id) ?? { admitted: 0, refused: 0 };
  const rows = ids.map((id) => {
    const gains = [], losses = [], newlyRefused = [], noLongerRefused = [];
    for (const [k, u] of B) { const p = A.get(k); if (!u.refusal && u.readings.includes(id) && (!p || p.refusal)) gains.push(k); if (u.refusal === id && (!p || p.refusal !== id)) newlyRefused.push(k); }
    for (const [k, p] of A) { const u = B.get(k); if (!p.refusal && p.readings.includes(id) && (!u || u.refusal)) losses.push(k); if (p.refusal === id && (!u || u.refusal !== id)) noLongerRefused.push(k); }
    return { id, before: count(a, id), after: count(b, id), gains, losses, newlyRefused, noLongerRefused };
  });
  return { units: [A.size, B.size], rows };
}
export function censusDiffReport(d) {
  const lines = ['| Reading | Admitted before | after | Refused before | after | Gains | Losses |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for (const r of d.rows) lines.push(`| \`${r.id}\` | ${r.before.admitted} | ${r.after.admitted} | ${r.before.refused} | ${r.after.refused} | ${r.gains.length} | ${r.losses.length} |`);
  lines.push('');
  for (const r of d.rows) for (const [what, list] of [['gains', r.gains], ['losses', r.losses], ['newly refused by it', r.newlyRefused], ['no longer refused by it', r.noLongerRefused]]) if (list.length) lines.push(`- \`${r.id}\` ${what} (${list.length}): ${list.slice(0, 12).join(', ')}${list.length > 12 ? ', ...' : ''}`);
  return lines.join('\n');
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  if (a[0] === '--diff') { // node census.mjs --diff <before.json> <after.json>: gains and losses per reading
    const d = censusDiff(JSON.parse(fs.readFileSync(a[1], 'utf8')), JSON.parse(fs.readFileSync(a[2], 'utf8')));
    console.log(censusDiffReport(d));
    process.exit(0);
  }
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const root = path.resolve(a[0]);
  const res = census(root, { limit: Number(opt('--limit', 0)), include: opt('--include', null), depth: Number(opt('--depth', 2)), log: (m) => console.error(m) });
  const out = opt('--out', null);
  const report = opt('--report', null);
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  if (report) fs.writeFileSync(report, censusReport(res));
  const readingsReport = opt('--readings-report', null);
  if (readingsReport) fs.writeFileSync(readingsReport, censusReadingsReport(res) + '\n');
  console.log(`${path.basename(root)}: ${res.files} files, ${res.units} units, ${res.entered} inside the subset (${res.share} percent), ${res.failedFiles} files unreadable, ${res.seconds} s`);
  for (const r of res.rules.slice(0, 25)) console.log(`  ${String(r.units).padStart(6)} units  ${r.rule.padEnd(22)} ${r.examples[0] ?? ''}`);
}
