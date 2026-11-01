#!/usr/bin/env node
// lean convert: rewrite code toward the subset the proof lane reads, one syntax-tree transform per advice entry, and
// prove every change with the pull-request check before keeping it.
//
//   node convert.mjs <file|folder>... [--project <tsconfig>|--no-project] [--narrowed] [--dry-run] [--no-prove]
//                    [--n 100] [--dafny-seconds 30] [--cache-dir <dir>] [--out report.md] [--json report.json]
//
// For each file: the lint runs with its advice (lintFile, advisory on); every finding whose rule has a transform in
// langs/ts/convert/ is planned at its site. The advice label, as the lint gives it at the site, decides what may be
// applied, and nothing else does:
//   proved       applied when the transform's shape matches the site (the static label, or the label the lint
//                decided at the site: loose-equality, bound-function, arguments);
//   conditional  listed with its precondition: a conditional site the lint has confirmed carries the label proved
//                there, so a site still labelled conditional is one whose precondition nobody established;
//   migration    listed for a person with the lint's advice;
//   flag-only    listed;
//   a rule with no transform is listed with the lint's advice.
// The strict family is the one door beside the labels: an edit TypeScript erases (an annotation an any-type finding
// proposes) is applied when the file's emitted JavaScript is unchanged, which proves it whatever the label (PASS-erased).
// --narrowed opens a second door a person asks for: a migration site in the narrowed shape a transform states, whose
// own guard keeps behaviour, and a conditional site whose precondition the transform decides on the syntax tree
// (`var`, which the lint does not decide), each still proved by pr.mjs; without it they are listed.
// Transforms run in rounds (a rewrite may open another); a round whose result types worse than its input (a new
// ts-strict finding or a syntax error) is undone site by site. Then, per folder, the changes are checked with pr.mjs
// against the commit the folder started from (HEAD, the working tree as head): a WITNESS on a changed function, or on
// an unchanged caller through it, reverts that file; an ASK keeps the file only when the parent against itself asks
// the same (the reason is lean's own, not the rewrite's), else reverts it. The report is a table per file: findings,
// applied, left for a person, verdicts; the exit code is 1 when a WITNESS remains, else 0.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ts, loadProgram, topLevelFunctions } from './common.mjs';
import { lintFile } from './lint/lint.mjs';
import { ADVICE } from './lint/advice.mjs';
import { nodeAt } from './convert/util.mjs';
import { erased, concreteType, emitHashes, ERASURE_SETTINGS } from './convert/strict-annotate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CODE = /\.(ts|tsx|mts|cts)$/;

// the transforms, one file each under convert/; a rule may have one transform
export async function loadTransforms() {
  const dir = path.join(here, 'convert');
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mjs') && x !== 'util.mjs').sort()) {
    const t = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    for (const r of t.rules) out.set(r, t);
  }
  return out;
}

const git = (repo, args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`); return r.stdout; };

function filesUnder(target) {
  const st = fs.statSync(target);
  if (st.isFile()) return CODE.test(target) && !target.endsWith('.d.ts') ? [path.resolve(target)] : [];
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { if (e.name === 'node_modules' || e.name.startsWith('.')) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (CODE.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p); } };
  walk(path.resolve(target));
  return out;
}

// what the label lets the converter do at this site: 'apply' with how it was decided, or 'list' with why. The label is
// the lint's at the site (lint.mjs: decided at the site for the three deciding rules, else the advice table's).
export function policy(finding, narrowed = false) {
  if (finding.label === 'proved') return { act: 'apply', how: finding.labelDecided ? 'proved (decided at the site by the lint)' : 'proved' };
  if (finding.label === 'conditional') {
    if (finding.labelDecided) return { act: 'list', why: `conditional: the lint did not establish the precondition here (${finding.precondition})` };
    if (narrowed) return { act: 'apply', how: 'conditional, precondition decided by the transform (--narrowed)' };
    return { act: 'list', why: `conditional: the lint does not decide this precondition; a person checks it (${finding.precondition})` };
  }
  if (finding.label === 'migration') return narrowed ? { act: 'apply', how: 'narrowed (--narrowed)' } : { act: 'list', why: 'migration: a person decides' };
  return { act: 'list', why: `${finding.label}: no rewrite is proposed` };
}

const typingCount = (fs_) => fs_.filter((f) => f.rule === 'ts-strict' || f.rule === 'unresolved-module').length;

// the strict family (convert/strict-*.mjs): a type error under strict mode and a value typed any are fixed only by
// edits that TypeScript erases, which each transform checks at its site (the emitted JavaScript is unchanged), so the
// label at such a site is proved by erasure whatever the advice table says; an any-type finding enters the converter
// only when it proposes one concrete type, the others stay the lint's advice (`--any-type`)
const STRICT_RULES = new Set(['ts-strict', 'any-type']);
const strictPolicy = (f) => (STRICT_RULES.has(f.rule) ? { act: 'apply', how: 'proved by erasure (decided at the site by the transform)' } : null);
// a strict finding is keyed by its site (a compiler message carries no source text, and two values may share a name)
const strictFindings = (fs_) => fs_.filter((f) => f.rule !== 'any-type' || concreteType(f.proposal)).map((f) => (STRICT_RULES.has(f.rule) ? { ...f, text: `${f.line}:${f.col} ${f.text ?? f.msg}` } : f));

// The text a round reads lives in memory, never in the source file (design/converter.md, 2026-10-30): the compiler
// host reads every file through ts.sys.readFile, so a path held here is read from this map. A dry run therefore writes
// no source file at any moment, and a run stopped mid-round leaves the tree as it was; a real run writes each file
// once, after its rounds.
const overlay = new Map();
const sysReadFile = ts.sys.readFile;
ts.sys.readFile = (p, enc) => { const k = path.resolve(p); return overlay.has(k) ? overlay.get(k) : sysReadFile.call(ts.sys, p, enc); };

function lintText(file, project) {
  const loaded = loadProgram(file, { project });
  const syntax = loaded.program.getSyntacticDiagnostics(loaded.sf).length;
  return { loaded, findings: strictFindings(lintFile(file, null, { loaded, advisory: true, anyType: true })), syntax };
}

function applyEdits(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// plan every finding of one lint; the non-overlapping plans in source order
function planAll(file, sf, checker, findings, transforms, narrowed, skip) {
  const plans = [], listed = [];
  for (const f of findings) {
    if (f.env) continue;
    const t = transforms.get(f.rule);
    const key = `${f.rule}:${f.text}`;
    if (!t) { listed.push({ ...f, why: f.label === 'migration' || !f.label ? 'migration: no transform; a person decides' : `${f.label}: no transform for this rule` }); continue; }
    const pol = strictPolicy(f) ?? policy(f, narrowed);
    if (pol.act === 'list') { listed.push({ ...f, why: pol.why }); continue; }
    if (skip.has(key)) { listed.push({ ...f, why: skip.get(key) }); continue; }
    let res;
    try { res = t.plan({ sf, checker, node: nodeAt(sf, f), finding: f, file }); } catch (e) { res = { list: `transform failed: ${String(e.message).slice(0, 160)}` }; }
    if (!res || res.list || !res.edits?.length) { listed.push({ ...f, why: res?.list ?? 'no edit' }); continue; }
    plans.push({ finding: f, key, transform: t.name, how: pol.how, guard: res.guard, edits: res.edits, start: Math.min(...res.edits.map((e) => e.start)), end: Math.max(...res.edits.map((e) => e.end)) });
  }
  plans.sort((a, b) => a.start - b.start || a.end - b.end);
  const chosen = [];
  for (const p of plans) if (!chosen.some((q) => p.start < q.end && q.start < p.end || (p.start === q.start))) chosen.push(p);
  return { chosen, listed };
}

// convert one file in rounds; returns { applied, listed, before, after, original, text }
export function convertFile(file, opts) {
  const { transforms, project = true, narrowed = false, rounds = 6, dry = false } = opts;
  const original = fs.readFileSync(file, 'utf8');
  const key = path.resolve(file);
  overlay.set(key, original);
  let cur = lintText(file, project);
  const before = cur.findings.filter((f) => !f.env);
  const applied = [], skip = new Map();
  let lastListed = [];
  try {
    for (let r = 0; r < rounds; r++) {
      const text = overlay.get(key);
      const { chosen, listed } = planAll(file, cur.loaded.sf, cur.loaded.checker, cur.findings, transforms, narrowed, skip);
      lastListed = listed;
      if (!chosen.length) break;
      const baseTyping = typingCount(cur.findings), baseSyntax = cur.syntax;
      const tryEdits = (ps) => { overlay.set(key, applyEdits(text, ps.flatMap((p) => p.edits))); const l = lintText(file, project); return { l, ok: l.syntax <= baseSyntax && typingCount(l.findings) <= baseTyping }; };
      let res = tryEdits(chosen), kept = chosen;
      if (!res.ok) {
        // undo site by site: keep the plans that type as well alone, then together
        kept = [];
        for (const p of chosen) { const one = tryEdits([p]); if (one.ok) kept.push(p); else skip.set(p.key, `the rewrite would not type: ${(one.l.findings.find((f) => f.rule === 'ts-strict')?.msg ?? 'a syntax error').slice(0, 140)}`); }
        res = kept.length ? tryEdits(kept) : null;
        if (!res || !res.ok) { for (const p of kept) skip.set(p.key, 'the rewrites at this site and another type worse together'); overlay.set(key, text); cur = lintText(file, project); continue; }
      }
      applied.push(...kept.map((p) => ({ rule: p.finding.rule, line: p.finding.line, unit: p.finding.unit, transform: p.transform, how: p.how, guard: p.guard, text: p.finding.text.replace(/\s+/g, ' ').slice(0, 100) })));
      cur = res.l;
    }
  } catch (e) { overlay.delete(key); throw e; }
  const final = overlay.get(key);
  overlay.delete(key);
  if (!dry && final !== original) fs.writeFileSync(file, final);
  const after = cur.findings.filter((f) => !f.env);
  const finalPlan = planAll(file, cur.loaded.sf, cur.loaded.checker, cur.findings, transforms, narrowed, skip);
  lastListed = finalPlan.listed.concat(finalPlan.chosen.map((p) => ({ ...p.finding, why: 'more rounds needed' })));
  return { file, applied, listed: lastListed.map((f) => ({ rule: f.rule, line: f.line, unit: f.unit, label: f.label, why: f.why, advice: f.advice ?? ADVICE[f.rule]?.text ?? null, text: (f.text ?? '').replace(/\s+/g, ' ').slice(0, 100) })), before: before.length, after: after.length, original, text: final };
}

// the control copies prove() writes beside a source (lane B imports them, so their relative imports must resolve
// there); a run stopped by a signal while one exists removes them before it exits. The handlers are installed only
// while a copy exists: that phase awaits lane B, so a handler runs at once, whereas a handler installed for the whole
// run would hold a signal back until the synchronous rounds end (Node runs signal handlers on the event loop)
const controls = new Set();
const SIGNALS = [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]];
const onSignal = Object.fromEntries(SIGNALS.map(([sig, code]) => [sig, () => { for (const c of controls) fs.rmSync(c, { force: true }); process.exit(code); }]));
const holdControl = (c) => { if (!controls.size) for (const [sig] of SIGNALS) process.on(sig, onSignal[sig]); controls.add(c); };
const dropControl = (c) => { fs.rmSync(c, { force: true }); controls.delete(c); if (!controls.size) for (const [sig] of SIGNALS) process.off(sig, onSignal[sig]); };

// prove the changed files of one folder with pr.mjs; revert a file on a WITNESS, or on an ASK the parent against
// itself does not share; returns the rows and the reverted files
export async function prove({ repo, base, files, project, n, dafnySeconds, cacheDir }) {
  const { prReport } = await import('./pr.mjs');
  const { check } = await import('./check.mjs');
  const rel = new Set(files.map((f) => path.relative(repo, f)));
  const run = () => prReport({ repo, base, head: 'WORKTREE', n, dafnySeconds, project, cacheDir, paths: (f) => rel.has(f) });
  let rows = await run();
  const reverted = new Map();
  for (const r of rows) {
    if (!rel.has(r.file) || reverted.has(r.file)) continue;
    // Removing a nested callback changes the enclosing body, whose head verdict covers that identity.
    if (r.decision === 'removed' && r['covered-by']) {
      const owner = rows.find(x => x.file === r.file && x.unit === r['covered-by'] && x.verdict !== null);
      if (owner) {
        r.verdict = owner.verdict; r.laneA = owner.laneA; r.laneB = owner.laneB;
        r.reason = `covered-by: ${r['covered-by']}`;
        r.certificate = { ...owner.certificate, unit: r.unit, 'covered-by': r['covered-by'] };
      }
    }
    if (r.verdict === 'WITNESS') { reverted.set(r.file, `WITNESS on ${r.unit}${r.caller ? ' (an unchanged caller)' : ''}: input ${r.witness?.input ?? '?'}`); continue; }
    if (r.verdict === 'ASK' || r.verdict === 'REFUSE' || r.verdict === null) {
      // the control, lane by lane: an ASK is lean's own when every lane that did not pass failed on the parent alone;
      // a row no lane answered (a timeout) checked nothing, and its file is reverted.
      // Lane A: a refusal to translate the parent (stage translate-parent), or no lane A run, depends on the parent's
      // text only; any other lane A answer (the candidate's translation, an unproved lemma) is about the rewrite.
      // Lane B: the parent against itself must give lane B's same verdict and reason. The two lanes are judged apart
      // because a self pair's combined verdict is lane A's identity on equal texts, which says nothing of lane B.
      const A = r.certificate?.lanes?.A ?? null, B = r.certificate?.lanes?.B ?? null;
      const passed = (v) => typeof v === 'string' && v.startsWith('PASS');
      const aOwn = !A || passed(A.verdict) || A.stage === 'translate-parent';
      let bOwn = !B || passed(B.verdict), ctlB = null;
      if (!bOwn) {
        const abs = path.join(repo, r.file);
        const ctl = path.join(path.dirname(abs), `.lean_ctl_${process.pid}_${path.basename(abs)}`);
        try {
          holdControl(ctl);
          fs.writeFileSync(ctl, git(repo, ['show', `${base}:${r.file}`]));
          const res = await check({ parent: ctl, candidate: ctl, unit: r.unit, n, project, dafnySeconds });
          ctlB = res.certificate?.lanes?.B ?? null;
          bOwn = !!ctlB && ctlB.verdict === B.verdict && (ctlB.reason ?? null) === (B.reason ?? null);
        } catch { bOwn = false; } finally { dropControl(ctl); }
      }
      if (!A && !B) reverted.set(r.file, `${r.verdict ?? 'no verdict'} on ${r.unit}: no lane answered (${String(r.reason ?? r.coverage ?? '').slice(0, 80)}), so the rewrite was not checked`);
      else if (!aOwn) reverted.set(r.file, `${r.verdict ?? 'no verdict'} on ${r.unit}: lane A ${A.verdict}${A.stage ? ` at ${A.stage}` : ''}, an answer about the rewrite, not the parent: ${String(A.detail ?? r.reason ?? '').slice(0, 120)}`);
      else if (!bOwn) reverted.set(r.file, `${r.verdict ?? 'no verdict'} on ${r.unit}: lane B ${B.verdict} that the parent against itself does not share (${ctlB ? `${ctlB.verdict}: ${String(ctlB.reason ?? '').slice(0, 80)}` : 'no control'}): ${String(B.reason ?? '').slice(0, 120)}`);
      else r.control = `lean's own: lane A ${A ? `${A.verdict}${A.stage ? ` at ${A.stage}` : ''}` : 'not run'}, lane B ${B?.verdict ?? 'not run'}${ctlB ? ', the same on the parent against itself' : ''}`;
    }
  }
  for (const f of reverted.keys()) fs.writeFileSync(path.join(repo, f), git(repo, ['show', `${base}:${f}`]));
  if (reverted.size) {
    // the rows of a reverted file stay in the report, marked, so the reason a rewrite was refused is readable
    const gone = rows.filter((r) => reverted.has(r.file)).map((r) => ({ ...r, reverted: true }));
    const keptFiles = [...rel].filter((f) => !reverted.has(f));
    rows = [...(keptFiles.length ? await prReport({ repo, base, head: 'WORKTREE', n, dafnySeconds, project, cacheDir, paths: (f) => keptFiles.includes(f) }) : []), ...gone];
  }
  return { rows, reverted };
}

// the rows of a file whose emitted JavaScript is the parent's: every unit whose text changed gets the verdict
// PASS-erased (what was checked: the emit under each setting, its hashes on both sides, the same), and its certificate
// carries the self-proof of the converted unit (check.mjs, the unit against itself: lane A reads it with its new types)
async function erasureRows(repo, r, { n, project, dafnySeconds }) {
  const { check } = await import('./check.mjs');
  const units = (text) => topLevelFunctions(ts.createSourceFile(r.file, text, ts.ScriptTarget.Latest, true));
  const before = units(r.original), after = units(r.text);
  const rel = path.relative(repo, r.file);
  const parentEmit = emitHashes(r.file, r.original), candidateEmit = emitHashes(r.file, r.text);
  const rows = [];
  for (const u of [...after.values()].filter((x) => before.get(x.name)?.node.getText() !== x.node.getText())) {
    let self = null;
    try { const res = await check({ parent: r.file, candidate: r.file, unit: u.name, n, project, dafnySeconds }); self = { verdict: res.verdict, laneA: res.certificate?.lanes?.A?.verdict ?? null, dafny: res.certificate?.lanes?.A?.dafny ?? null }; }
    catch (e) { self = { verdict: null, error: String(e.message).slice(0, 160) }; }
    rows.push({ file: rel, unit: u.name, verdict: 'PASS-erased', coverage: 'checked', laneA: 'erasure', laneB: null, caller: false, control: null,
      reason: `erasure: the emitted JavaScript is the parent's under ${ERASURE_SETTINGS}; the converted unit against itself: ${self.verdict ?? 'no verdict'}`,
      certificate: { verdict: 'PASS-erased', unit: u.name, checked: 'identical emitted JavaScript under each setting, and the converted unit proved against itself', settings: ERASURE_SETTINGS, parentEmit, candidateEmit, self } });
  }
  return rows;
}

const verdictCell = (rows) => {
  const c = {};
  for (const r of rows) { const k = r.verdict ?? r.coverage ?? 'none'; c[k] = (c[k] ?? 0) + 1; }
  return Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', ') || '';
};
const byRule = (xs) => { const c = {}; for (const x of xs) c[x.rule] = (c[x.rule] ?? 0) + 1; return Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', '); };

export function table(folder, results, proof, repo) {
  const lines = [`### ${folder}`, '', '| file | findings | applied | listed for a person | verdicts |', '|---|---:|---|---:|---|'];
  for (const r of results) {
    const rel = path.relative(repo, r.file);
    const rows = (proof?.rows ?? []).filter((x) => x.file === rel);
    const rev = proof?.reverted.get(rel);
    const applied = rev ? `0 (reverted: ${rev})` : r.applied.length ? `${r.applied.length} (${byRule(r.applied)})` : '0';
    lines.push(`| ${rel} | ${r.before} | ${applied} | ${rev ? r.before : r.listed.length} | ${rev ? 'reverted' : proof ? verdictCell(rows) || (r.applied.length ? 'no changed function' : '') : 'not proved'} |`);
  }
  const tot = (k) => results.reduce((s, r) => s + k(r), 0);
  const kept = results.filter((r) => !proof?.reverted.has(path.relative(repo, r.file)));
  lines.push(`| total | ${tot((r) => r.before)} | ${kept.reduce((s, r) => s + r.applied.length, 0)} | ${tot((r) => (proof?.reverted.has(path.relative(repo, r.file)) ? r.before : r.listed.length))} | ${proof ? verdictCell(proof.rows.filter((x) => !x.reverted && results.some((r) => path.relative(repo, r.file) === x.file))) : ''} |`);
  return lines.join('\n');
}

function detail(results, repo) {
  const out = [];
  for (const r of results) {
    if (!r.applied.length && !r.listed.length) continue;
    out.push(`#### ${path.relative(repo, r.file)}`, '');
    for (const a of r.applied) out.push(`- applied line ${a.line} \`${a.rule}\` by ${a.transform} [${a.how}]: ${a.guard}`);
    for (const l of r.listed) out.push(`- listed line ${l.line} \`${l.rule}\` [${l.label}]: ${l.why}${l.advice ? `; advice: ${l.advice}` : ''}`);
    out.push('');
  }
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const valued = new Set(['--project', '--n', '--dafny-seconds', '--cache-dir', '--out', '--json']);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const targets = a.filter((x, i) => !x.startsWith('--') && !valued.has(a[i - 1]));
  if (!targets.length) { console.error('usage: convert.mjs <file|folder>... [--project <tsconfig>|--no-project] [--narrowed] [--dry-run] [--no-prove] [--n 100] [--dafny-seconds 30] [--cache-dir <dir>] [--out report.md] [--json report.json]'); process.exit(2); }
  const project = a.includes('--no-project') ? false : opt('--project', true);
  const narrowed = a.includes('--narrowed'), dry = a.includes('--dry-run'), noProve = a.includes('--no-prove') || dry;
  const n = Number(opt('--n', 100)), dafnySeconds = Number(opt('--dafny-seconds', 30)), cacheDir = opt('--cache-dir', null) ?? undefined;
  const transforms = await loadTransforms();
  const md = ['# lean convert', ''], json = [];
  let witness = 0;
  for (const target of targets) {
    const abs = fs.realpathSync(path.resolve(target));
    const dir = fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);
    const repo = fs.realpathSync(git(dir, ['rev-parse', '--show-toplevel']).trim());
    const base = git(repo, ['rev-parse', 'HEAD']).trim();
    const files = filesUnder(abs);
    const dirty = git(repo, ['status', '--porcelain', '--', ...files.map((f) => path.relative(repo, f))]).trim();
    if (dirty) { console.error(`${target}: uncommitted changes under it; the proof compares against HEAD, so commit or set them aside first:\n${dirty}`); process.exit(2); }
    const results = [];
    for (const f of files) {
      let r;
      try { r = convertFile(f, { transforms, project, narrowed, dry }); }
      catch (e) { console.error(`${path.relative(repo, f)}: not converted: ${String(e.message).slice(0, 200)}`); continue; }
      results.push(r);
      console.error(`${path.relative(repo, f)}: ${r.before} finding(s), ${r.applied.length} applied, ${r.listed.length} listed`);
    }
    const changedAll = results.filter((r) => r.text !== r.original);
    // a file whose emitted JavaScript is the parent's (the strict family's edits only) is proved by erasure, unit by unit;
    // the others go through pr.mjs
    const byErasure = changedAll.filter((r) => erased(r.file, r.original, r.text));
    const changed = changedAll.filter((r) => !byErasure.includes(r)).map((r) => r.file);
    let proof = noProve || !changed.length ? null : await prove({ repo, base, files: changed, project, n, dafnySeconds, cacheDir });
    if (!noProve && byErasure.length) { proof ??= { rows: [], reverted: new Map() }; for (const r of byErasure) proof.rows.push(...await erasureRows(repo, r, { n, project, dafnySeconds })); }
    if (proof) witness += proof.rows.filter((r) => r.verdict === 'WITNESS' && !r.reverted).length; // a WITNESS on a reverted file was answered by the revert
    md.push(table(path.relative(repo, abs) || '.', results, proof, repo), '', detail(results, repo));
    // the strict family's proof, named per file: the emitted JavaScript compared under each setting erased() reads
    if (!noProve && byErasure.length) md.push('#### PASS-erased: the emitted JavaScript is identical', '', ...byErasure.map((r) => `- ${path.relative(repo, r.file)}: identical under ${ERASURE_SETTINGS}`), '');
    json.push({ target: path.relative(repo, abs), base, files: results.map(({ original, text, ...r }) => ({ ...r, file: path.relative(repo, r.file), reverted: proof?.reverted.get(path.relative(repo, r.file)) ?? null, erasure: !noProve && byErasure.includes(r) ? ERASURE_SETTINGS : null })), rows: proof?.rows.map((r) => ({ file: r.file, unit: r.unit, verdict: r.verdict, coverage: r.coverage, laneA: r.laneA, laneB: r.laneB, caller: !!r.caller, reason: r.reason, control: r.control ?? null, reverted: !!r.reverted, ...(r.witness ? { witness: { input: r.witness.input ?? null } } : {}), ...(r.verdict === 'PASS-erased' ? { certificate: r.certificate } : {}) })) ?? null });
  }
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(json, null, 1));
  if (opt('--out')) fs.writeFileSync(opt('--out'), md.join('\n'));
  console.log(md.join('\n'));
  process.exit(witness ? 1 : 0);
}
