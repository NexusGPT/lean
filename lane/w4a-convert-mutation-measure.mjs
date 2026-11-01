#!/usr/bin/env node
// w4a measurement: convert a copy of a census root with the mutation family's five transforms only, prove the changed
// files as convert.mjs does, and count per transform.
//   node lane/w4a-convert-mutation-measure.mjs <root-copy> --out <json> [--dry-run] [--n 30] [--dafny-seconds 30]
//          [--cache-dir <dir>] [--files <list.txt>]
// The root copy must be a git repository whose HEAD is the original (the proof compares against HEAD) and is written
// in place (never a census repository itself). Each file goes through convert.mjs convertFile with the converter's table
// restricted to closure-counter, hoist-update, rebuild-by-spread, param-copy and explicit-return, under --narrowed (the
// door their sites need). Then, as convert.mjs's command line does: a file whose emitted JavaScript is unchanged (the
// explicit-return edits only) is proved by erasure; the others go through convert.mjs prove (pr.mjs against HEAD, a
// WITNESS or an ASK that is not lean's own reverts the file). The JSON holds, per file, the applied sites with their
// transform, the listed sites of the five transforms' rules with the reason, and whether the file was kept or reverted.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadTransforms, convertFile, prove } from '../langs/ts/convert.mjs';
import { erased } from '../langs/ts/convert/strict-annotate.mjs';

const MINE = new Set(['closure-counter', 'hoist-update', 'rebuild-by-spread', 'param-copy', 'explicit-return']);
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const root = path.resolve(a[0]);
const out = opt('--out', null);
const dry = a.includes('--dry-run');
const n = Number(opt('--n', 30)), dafnySeconds = Number(opt('--dafny-seconds', 30)), cacheDir = opt('--cache-dir', undefined);
if (!out || !fs.existsSync(path.join(root, '.git'))) { console.error('usage: w4a-convert-mutation-measure.mjs <root-copy (a git repository)> --out <json> [--dry-run]'); process.exit(2); }
const git = (args) => { const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
const base = git(['rev-parse', 'HEAD']).trim();

const all = await loadTransforms();
const transforms = new Map([...all].filter(([, t]) => MINE.has(t.name)));
const rules = new Set(transforms.keys());
// the files convert.mjs walks (filesUnder): .ts/.tsx/.mts/.cts, no declarations, no node_modules, no dot folders
const CODE = /\.(ts|tsx|mts|cts)$/;
const files = [];
if (opt('--files', null)) files.push(...fs.readFileSync(opt('--files'), 'utf8').split('\n').filter(Boolean).map((f) => path.resolve(root, f)));
else { const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) { if (e.name === 'node_modules' || e.name.startsWith('.')) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (CODE.test(e.name) && !e.name.endsWith('.d.ts')) files.push(p); } }; walk(root); }

const t0 = Date.now();
const results = [];
for (const [i, f] of files.entries()) {
  let r;
  try { r = convertFile(f, { transforms, project: true, narrowed: true, dry }); }
  catch (e) { results.push({ file: path.relative(root, f), error: String(e.message).slice(0, 200) }); continue; }
  const listed = r.listed.filter((l) => rules.has(l.rule) && !/no transform/.test(l.why ?? ''));
  results.push({ file: path.relative(root, f), applied: r.applied.map((x) => ({ transform: x.transform, rule: x.rule, line: x.line, unit: x.unit })), listed: listed.map((l) => ({ rule: l.rule, line: l.line, why: l.why })), changed: r.text !== r.original, erasedOnly: r.text !== r.original && erased(f, r.original, r.text) });
  if ((i + 1) % 100 === 0) console.error(`${i + 1}/${files.length} files, ${results.filter((x) => x.changed).length} changed, ${Math.round((Date.now() - t0) / 1000)} s`);
}
const changed = results.filter((x) => x.changed);
let reverted = new Map(), rows = [];
if (!dry) {
  const toProve = changed.filter((x) => !x.erasedOnly).map((x) => path.join(root, x.file));
  console.error(`proving ${toProve.length} file(s) with pr.mjs; ${changed.length - toProve.length} by erasure`);
  if (toProve.length) ({ reverted, rows } = await prove({ repo: root, base, files: toProve, project: true, n, dafnySeconds, cacheDir }));
}
for (const x of changed) x.reverted = reverted.get(x.file) ?? null;
// per transform: sites applied, files touched, files kept, files reverted (a file is counted under each transform that
// applied a site in it)
const per = {};
for (const t of MINE) per[t] = { applied: 0, files: 0, kept: 0, reverted: 0, listed: 0 };
const ruleOf = Object.fromEntries([...transforms].map(([rule, t]) => [rule, t.name]));
for (const x of results) {
  for (const s of x.applied ?? []) per[s.transform].applied++;
  for (const l of x.listed ?? []) per[ruleOf[l.rule]].listed++;
  for (const t of new Set((x.applied ?? []).map((s) => s.transform))) { per[t].files++; if (!dry) (x.reverted ? per[t].reverted++ : per[t].kept++); }
}
const summary = { root, base, dry, n, dafnySeconds, files: files.length, converted: changed.length, reverted: reverted.size, erasedOnly: changed.filter((x) => x.erasedOnly).length, seconds: Math.round((Date.now() - t0) / 1000), per };
fs.writeFileSync(out, JSON.stringify({ summary, results, rows: rows.map((r) => ({ file: r.file, unit: r.unit, verdict: r.verdict, reason: r.reason ?? null, reverted: !!r.reverted, control: r.control ?? null })) }, null, 1));
console.log(JSON.stringify(summary, null, 1));
