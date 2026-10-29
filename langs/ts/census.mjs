#!/usr/bin/env node
// lean census: every TypeScript function of a repository through the gate, the blockers counted.
//   node census.mjs <repo-root> [--out census.json] [--report census.md] [--readings-report readings.md] [--depth N] [--limit N] [--include <prefix>] [--js]
//   node census.mjs --diff <before.json> <after.json>     gains and losses per reading between two runs
//   [--install-under <dir>] [--npm-cache <dir>] [--clean-after]
// With --install-under, a root inside that folder first gets its own pinned dependency graph (census-env.mjs
// ensureInstalled: the lockfile's package manager, frozen, --ignore-scripts, once per lockfile content); a root outside
// it is read as it stands. A unit an `unresolved-module` finding reaches is environment-blocked (census-env.mjs names the
// kind of its first such finding, or `install-failed` when the install failed), apart from entered and language-refused:
// its types are unknown, so its language findings are not read as refusals.
// Walks .ts/.tsx/.mts under the root (skipping node_modules, dist, build, .next, coverage, tests, stories,
// declarations; --js also walks .js/.jsx/.mjs/.cjs, counted apart under `languages`), lints each file inside its project, and reports: units, units inside the subset, the rule counts
// with three examples each, per package and in total. Read-only: nothing is written into the repository.
import fs from 'node:fs';
import path from 'node:path';
import { lowerFile } from './lower.mjs'; // the lowering's record: the lint's findings and, per unit, its readings and its refusal (design/admission-contract.md)
import { loadManyChunks, topLevelFunctions, lineOf, findingUnit } from './common.mjs';
import { classifier, ensureInstalled, cleanInstall } from './census-env.mjs';
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts|js|jsx|mjs|cjs)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;

// the files the census reads: TypeScript by default; `ext` widens it (the reach-gap count reads JavaScript files too)
export const TS_EXT = /\.(ts|tsx|mts)$/, JS_EXT = /\.(js|jsx|mjs|cjs)$/, ANY_EXT = /\.(ts|tsx|mts|js|jsx|mjs|cjs)$/;
export function* walk(dir, ext = TS_EXT) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name), ext); continue; }
    if (ext.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}
function packageOf(root, file) {
  const rel = path.relative(root, file).split(path.sep);
  if ((rel[0] === 'apps' || rel[0] === 'packages' || rel[0] === 'libs' || rel[0] === 'services') && rel.length > 2) return `${rel[0]}/${rel[1]}`;
  return rel[0];
}

export function census(root, opts = {}) {
  const { limit = 0, include = null, depth = 2, log = () => {}, js = false, installUnder = null, npmCache = null } = opts;
  if (!Number.isSafeInteger(depth) || depth < 0) throw new Error('depth must be a nonnegative integer');
  // the environment first: an install changes what every later read resolves
  const install = installUnder ? ensureInstalled(root, { under: installUnder, cache: npmCache, log }) : { status: 'not-requested' };
  if (install.status === 'install-failed') log(`! install failed (exit ${install.exit}): ${install.stderr?.split('\n').slice(-1)[0] ?? ''}`);
  const env = classifier(root);
  const envUnits = new Map(); // environment kind -> units reaching an unresolved module or global of that kind
  const refusalGroups = new Map();
  const date = new Date().toISOString().slice(0, 10);
  const rules = new Map(); // rule -> {count, units:Set, examples:[]}
  const readings = new Map(); // reading id -> { admitted: units admitted that use it, refused: units it refuses }
  const reading = (id) => { if (!readings.has(id)) readings.set(id, { id, admitted: 0, refused: 0 }); return readings.get(id); };
  const perPackage = new Map();
  const languages = {}; // ts and (with --js) js: files, units, units inside the subset
  const records = []; // one per file: what the per-file reader needs
  let files = 0, units = 0, entered = 0, failedFiles = 0, nested = 0, nestedEntered = 0, environmentBlocked = 0, languageRefused = 0; // nested: units inside another unit's body (callbacks), covered by it
  const t0 = Date.now();
  const list = [];
  for (const file of walk(root, js ? ANY_EXT : TS_EXT)) {
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
    let findings, unitNames, sourceLines, lowered, inventory, envBlocked;
    try {
      const L = loaded.get(path.resolve(file));
      if (!L || L.error) throw new Error(L?.error ?? 'not loaded');
      const { sf } = L;
      sourceLines = sf.text.split(/\r?\n/);
      inventory = topLevelFunctions(sf);
      unitNames = [...inventory.values()].map((u) => [u.name, lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]);
      const rec = lowerFile(file, null, { project: true, loaded: L }); findings = rec.findings;
      for (const f of findings) f.unit = findingUnit(sf, inventory, f)?.name ?? null; // a finding belongs to the unit the lint named, else the innermost containing unit
      lowered = rec.units.map((u) => ({ unit: u.unit, readings: u.readings.map((r) => r.id), refusal: u.refusal ? u.refusal.id : null }));
      envBlocked = new Set(findings.filter((f) => f.rule === 'unresolved-module' && f.unit).map((f) => f.unit)); // judged on unknown types: neither admitted nor refused by a reading
      for (const u of rec.units) { if (envBlocked.has(u.unit)) continue; if (u.refusal) reading(u.refusal.id).refused++; else for (const r of u.readings) reading(r.id).admitted++; }
    } catch (e) { failedFiles++; records.push({ file: path.relative(root, file), pkg, error: String(e.message).slice(0, 200) }); log(`! ${path.relative(root, file)}: ${String(e.message).slice(0, 120)}`); continue; }
    // an unresolved-module finding names its module (or global) and its kind; the unit it falls in is counted once
    const envSeen = new Set();
    const named = findings.map((f) => {
      const o = { line: f.line, unit: f.unit, rule: f.rule, msg: f.msg, env: !!f.env };
      if (f.rule !== 'unresolved-module') return o;
      const c = env.classify(file, f.msg);
      o.kind = install.status === 'install-failed' ? 'install-failed' : c.kind + (c.generated ? ' (generated)' : '');
      if (c.name) o.module = c.name;
      if (c.install) o.packageState = c.install;
      if (f.unit && !envSeen.has(f.unit)) { envSeen.add(f.unit); envUnits.set(o.kind, (envUnits.get(o.kind) ?? 0) + 1); }
      return o;
    });
    records.push({ file: path.relative(root, file), pkg, units: unitNames.map(([n, a, b]) => ({ name: n, lines: [a, b] })), lowering: lowered, findings: named });
    const blocked = new Set();
    const stop = (unit, f, rule) => {
      blocked.add(unit);
      const relative = path.relative(root, file).split(path.sep).join('/');
      const directory = relative.split('/').slice(0, -1).slice(0, depth).join('/') || '.';
      const r = refusalGroups.get(rule) ?? { rule, units: 0, directories: new Map() };
      r.units++;
      const d = r.directories.get(directory) ?? {
        directory, units: 0,
        example: { file: relative, line: f.line, code: (f.text ?? sourceLines[f.line - 1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) },
      };
      d.units++;
      r.directories.set(directory, d);
      refusalGroups.set(rule, r);
    };
    // A unit whose module or global still does not resolve (after the environment rungs) is not inside the subset: its
    // types are unknown. It is counted once, apart from the language refusals, under `environment: <kind>` of its first
    // such finding; its language findings are not read as refusals, since they were judged on unknown types.
    named.forEach((o, i) => { if (o.rule === 'unresolved-module' && o.unit && !blocked.has(o.unit)) { stop(o.unit, findings[i], `environment: ${o.kind}`); environmentBlocked++; } });
    for (const f of findings) {
      const unit = f.unit;
      if (unit && !f.env && !blocked.has(unit)) {
        // Count each stopped unit under its first refusal. Environment findings do not stop a unit.
        stop(unit, f, f.rule); languageRefused++;
      }
      const r = rules.get(f.rule) ?? { count: 0, units: new Set(), examples: [] };
      r.count++; if (unit) r.units.add(`${file}:${unit}`);
      if (r.examples.length < 3) r.examples.push(`${path.relative(root, file)}:${f.line} ${f.msg.slice(0, 110)}`);
      rules.set(f.rule, r);
    }
    // a nested unit is covered by its enclosing unit (pr.mjs, check.mjs): a stopped enclosing unit stops it too, counted under covered-by
    for (const u of inventory.values()) if (u.enclosingUnit && !blocked.has(u.name)) { let p = u.enclosingUnit; while (p && !blocked.has(p.name)) p = p.enclosingUnit; if (p) { blocked.add(u.name); const r = rules.get('covered-by') ?? { count: 0, units: new Set(), examples: [] }; r.count++; r.units.add(`${file}:${u.name}`); rules.set('covered-by', r); } }
    { const ns = [...inventory.values()].filter((u) => u.enclosingUnit); nested += ns.length; nestedEntered += ns.filter((u) => !blocked.has(u.name)).length; }
    units += unitNames.length; entered += unitNames.length - blocked.size;
    { const lang = JS_EXT.test(file) ? 'js' : 'ts'; const Lg = languages[lang] ??= { files: 0, units: 0, entered: 0 }; Lg.files++; Lg.units += unitNames.length; Lg.entered += unitNames.length - blocked.size; }
    P.units += unitNames.length; P.entered += unitNames.length - blocked.size;
    if (files % 50 === 0) log(`${files} files, ${units} units, ${entered} inside, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  const ruleRows = [...rules.entries()].map(([rule, r]) => ({ rule, findings: r.count, units: r.units.size, examples: r.examples })).sort((a, b) => b.units - a.units);
  const refusalRules = [...refusalGroups.values()].map((r) => ({
    rule: r.rule, units: r.units,
    directories: [...r.directories.values()].sort((a, b) => a.directory.localeCompare(b.directory)),
  })).sort((a, b) => b.units - a.units || a.rule.localeCompare(b.rule));
  const blockedKinds = Object.fromEntries([...refusalGroups.values()].filter((r) => r.rule.startsWith('environment: ')).map((r) => [r.rule.slice(13), r.units]).sort((a, b) => b[1] - a[1]));
  const environment = { install, units: [...envUnits.values()].reduce((a, b) => a + b, 0), kinds: Object.fromEntries([...envUnits].sort((a, b) => b[1] - a[1])), blockedKinds };
  return { root, date, depth, languages, nested: { units: nested, entered: nestedEntered }, independent: { units: units - nested, entered: entered - nestedEntered }, refused: units - entered, environmentBlocked, languageRefused, environment, refusalRules, readings: [...readings.values()].sort((a, b) => a.id.localeCompare(b.id)), files, failedFiles, units, entered, share: units ? Math.round((1000 * entered) / units) / 10 : null, seconds: Math.round((Date.now() - t0) / 1000), rules: ruleRows, records, packages: [...perPackage.entries()].map(([pkg, p]) => ({ pkg, ...p })).sort((a, b) => b.units - a.units) };
}

// Render only the saved census result. No files are read and no units are linted here.
export function censusReport(res) {
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;');
  const code = (s) => `<code>${escape(s)}</code>`;
  const lines = [
    `# Census: ${code(path.basename(res.root))}`, '',
    `Date: ${res.date} (UTC)`, '',
    `Units: ${res.units}. Inside the subset: ${res.entered} (${res.share ?? 'n/a'} percent). Refused: ${res.refused}. Files unreadable: ${res.failedFiles}.`, '',
    ...(res.languages?.js ? [`By language: TypeScript ${res.languages.ts?.units ?? 0} units (${res.languages.ts?.entered ?? 0} inside, ${res.languages.ts?.files ?? 0} files); JavaScript ${res.languages.js.units} units (${res.languages.js.entered} inside, ${res.languages.js.files} files).`, ''] : []),
    '| Entered | Environment-blocked | Language-refused |', '| ---: | ---: | ---: |', `| ${res.entered} | ${res.environmentBlocked ?? 0} | ${res.languageRefused ?? res.refused} |`, '',
    ...(res.environment && Object.keys(res.environment.blockedKinds ?? {}).length ? ['Environment-blocked by kind: ' + Object.entries(res.environment.blockedKinds).map(([k, n]) => `${k} ${n}`).join(', ') + '.', ''] : []),
    'Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.', '',
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
  const res = census(root, { limit: Number(opt('--limit', 0)), include: opt('--include', null), depth: Number(opt('--depth', 2)), js: a.includes('--js'), installUnder: opt('--install-under', null), npmCache: opt('--npm-cache', null), log: (m) => console.error(m) });
  // --clean-after: the disk budget keeps one installed root at a time; the root's node_modules go once it is read
  if (a.includes('--clean-after')) { const removed = cleanInstall(root, opt('--install-under', null)); res.environment.cleaned = removed.length; }
  const out = opt('--out', null);
  const report = opt('--report', null);
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  if (report) fs.writeFileSync(report, censusReport(res));
  const readingsReport = opt('--readings-report', null);
  if (readingsReport) fs.writeFileSync(readingsReport, censusReadingsReport(res) + '\n');
  console.log(`${path.basename(root)}: ${res.files} files, ${res.units} units, ${res.entered} inside the subset (${res.share} percent), ${res.environmentBlocked} environment-blocked, ${res.languageRefused} language-refused, ${res.failedFiles} files unreadable, ${res.seconds} s`);
  const st = res.environment.install;
  console.log(`  environment: install ${st.status}${st.exit !== undefined ? ` (exit ${st.exit}, ${st.command})` : ''}; ${res.environment.units} units reach an unresolved module or global: ${Object.entries(res.environment.kinds).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
  for (const r of res.rules.slice(0, 25)) console.log(`  ${String(r.units).padStart(6)} units  ${r.rule.padEnd(22)} ${r.examples[0] ?? ''}`);
}
