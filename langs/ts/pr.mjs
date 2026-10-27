#!/usr/bin/env node
// lean pr: a whole change at once. Give it a checkout and two git refs (the base and the head of a pull request, or
// a commit and its parent); it finds every changed function, runs both lanes on each, and prints one report:
// a verdict per function with its certificate pointer, and for every ASK the lint's advice on what to change.
// An unchanged caller of a changed function gets a row too when lane B finds a WITNESS through that callee.
//
//   node pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--out report.md] [--json report.json]
//               [--n 100] [--dafny-seconds 30] [--project <tsconfig>|--no-project] [--adapters scope.json]
//
// A changed signature proves only through an adapter the developer declares: the scope door (`--adapters`, a scope
// file whose "adapters" maps a Dafny function name to {from, to, map}) or the comment door (`// lean-adapter {...}`
// just above the candidate function, read by check.mjs from the head file). Without one it stays ASK:interface.
//
// How it reads the two versions without a second checkout: the head version is the file in the checkout (or the
// head ref's content written beside it); the base version is `git show base:path` written beside the file under a
// dotted name, so its imports resolve exactly as the real file's do. Both temporary files are removed at the end.
// The checkout is never modified otherwise and nothing is committed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ts, loadProgram, topLevelFunctions } from './common.mjs';
import { check } from './check.mjs';
import { lintFile } from './lint/lint.mjs';
import { formatOp } from './patch.mjs';
import { runPair } from './exec/run.mjs';
import { callersOf } from './exec/callees.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const git = (repo, args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`); return r.stdout; };
const CODE = /\.(ts|tsx|mts)$/; const SKIP = /(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|stories)(\/|$)|\.(test|spec|stories|d)\.(ts|tsx)$/;

// changed line ranges of the HEAD side per file, from the unified diff
function changedRanges(repo, base, head) {
  const out = git(repo, ['diff', '--unified=0', '--no-color', base, head === 'WORKTREE' ? undefined : head, '--'].filter(Boolean));
  const files = new Map(); let cur = null;
  for (const ln of out.split('\n')) {
    const f = ln.match(/^\+\+\+ b\/(.*)$/); if (f) { cur = f[1]; if (!files.has(cur)) files.set(cur, []); continue; }
    const h = ln.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (h && cur) { const a = Number(h[1]); const n = h[2] === undefined ? 1 : Number(h[2]); files.get(cur).push([a, Math.max(a, a + n - 1)]); }
  }
  return files;
}

// the units of a file (top-level functions, arrow consts, class methods) whose span meets a changed range
function changedUnits(file, ranges, project) {
  const { sf } = loadProgram(file, { project });
  const units = topLevelFunctions(sf);
  const out = [];
  for (const u of units.values()) {
    const a = sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1, b = sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1;
    if (ranges.some(([s, e]) => s <= b && a <= e)) out.push({ name: u.name, start: a, end: b });
  }
  return out;
}

export async function prReport(opts) {
  const { repo, base, head = 'WORKTREE', n = 100, dafnySeconds = 30, project = true, scope = new Set(), filesRoot = null, maxUnits = null, adapters = null } = opts;
  // filesRoot: a tree that mirrors the checkout (an export of it); the temporary files are written there, so a checkout
  // that must stay untouched is only read through git
  const files = changedRanges(repo, base, head);
  const rows = []; const temps = [];
  let runs = 0, callersChecked = 0; // maxUnits (comment.mjs --max-functions) bounds the unchanged callers: their lane B runs count against it with every changed function's check
  try {
    for (const [rel, ranges] of files) {
      if (!CODE.test(rel) || SKIP.test(rel)) continue;
      const abs = path.join(filesRoot ?? repo, rel);
      if (filesRoot && !fs.existsSync(path.dirname(abs))) fs.mkdirSync(path.dirname(abs), { recursive: true });
      if (head !== 'WORKTREE') { const txt = (() => { try { return git(repo, ['show', `${head}:${rel}`]); } catch { return null; } })(); if (txt === null) continue; }
      const headFile = head === 'WORKTREE' ? abs : (() => { const p = path.join(path.dirname(abs), `.lean_head_${path.basename(abs)}`); fs.writeFileSync(p, git(repo, ['show', `${head}:${rel}`])); temps.push(p); return p; })();
      if (!fs.existsSync(headFile)) continue;
      let baseTxt = null; try { baseTxt = git(repo, ['show', `${base}:${rel}`]); } catch { /* new file */ }
      const units = changedUnits(headFile, ranges, project);
      if (!baseTxt) { for (const u of units) rows.push({ file: rel, unit: u.name, verdict: 'ASK', reason: 'new file: no parent to compare with', lines: [u.start, u.end] }); continue; }
      const baseFile = path.join(path.dirname(abs), `.lean_base_${path.basename(abs)}`);
      fs.writeFileSync(baseFile, baseTxt); temps.push(baseFile);
      for (const u of units) {
        if (scope.has(u.name) || scope.has(`${rel}:${u.name}`)) {
          // declared in scope: this function was meant to change; its difference is information, not a refusal
          let b = null; runs++; try { b = (await check({ parent: baseFile, candidate: headFile, unit: u.name, n, project, dafnySeconds: 1 })).certificate?.lanes?.B ?? null; } catch { /* keep */ }
          rows.push({ file: rel, unit: u.name, lines: [u.start, u.end], verdict: 'IN-SCOPE', laneB: b?.verdict ?? null, laneA: null, witness: b?.witnesses?.[0] ?? null, reason: b?.verdict === 'WITNESS' ? 'changed as asked: the two versions differ' : b?.verdict === 'PASS-bounded' ? 'declared in scope but no difference found within the bound' : (b?.reason ?? null), advice: [] });
          continue;
        }
        let res; runs++;
        try { res = await check({ parent: baseFile, candidate: headFile, unit: u.name, n, project, dafnySeconds, adapters }); }
        catch (e) { res = { verdict: 'ASK', certificate: { lanes: { A: { verdict: 'ASK', detail: String(e.message).slice(0, 300) } } } }; }
        const lanes = res.certificate?.lanes ?? {};
        const row = { file: rel, unit: u.name, lines: [u.start, u.end], verdict: res.verdict, laneB: lanes.B?.verdict ?? null, laneA: lanes.A?.verdict ?? null, witness: res.witness ? { input: res.witness.input, args: res.witness.args, where: res.witness.where, ...(res.witness.through ? { through: res.witness.through } : {}), ...(Array.isArray(res.witness.patch) ? { patch: res.witness.patch, patchSummary: res.witness.patchSummary } : {}) } : null, reason: lanes.A?.detail ?? lanes.B?.reason ?? null, advice: [], ...(lanes.A?.adapter ? { adapter: lanes.A.adapter.theorem } : {}), ...(lanes.A?.restsOn?.length ? { restsOn: lanes.A.restsOn.map((x) => `${x.callee} ${x.verdict}`) } : {}) };
        if (res.verdict !== 'PASS-proved' && res.verdict !== 'WITNESS') {
          try { const f = lintFile(headFile, [[u.start, u.end]], { project }); row.advice = f.slice(0, 8).map((x) => ({ line: x.line, rule: x.rule, msg: x.msg, do: x.advice })); } catch { /* none */ }
        }
        rows.push(row);
      }
      // an unchanged caller of a changed function: its text did not move, so the diff names it nowhere, but a difference
      // may show through the callee on the caller's inputs. Lane B alone runs on it; it gets a row only when it is a
      // WITNESS that came through a changed callee (where.cause 'callee')
      const changedNames = new Set(units.map((u) => u.name));
      if (changedNames.size && !(maxUnits && runs >= maxUnits)) {
        const { sf, checker } = loadProgram(headFile, { project: false });
        const all = topLevelFunctions(sf);
        let callers = []; try { callers = callersOf(sf, checker, [...changedNames]); } catch { /* unread: no caller runs */ }
        for (const name of callers) {
          if (scope.has(name) || scope.has(`${rel}:${name}`)) continue;
          if (maxUnits && runs >= maxUnits) break;
          runs++; callersChecked++;
          let b = null; try { b = await runPair({ parent: baseFile, candidate: headFile, unit: name, n, project }); } catch { /* no row */ }
          const w = b?.verdict === 'WITNESS' ? b.witnesses?.[0] : null;
          if (!w || w.where?.cause !== 'callee') continue; // an ASK or a PASS on a caller adds no row
          const u = all.get(name); const a = sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1, e = sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1;
          rows.push({ file: rel, unit: name, lines: [a, e], verdict: 'WITNESS', laneB: 'WITNESS', laneA: null, caller: true, witness: { input: w.input, args: w.args, where: w.where, through: w.through, ...(Array.isArray(w.patch) ? { patch: w.patch, patchSummary: w.patchSummary } : {}) }, reason: null, advice: [] });
        }
      }
    }
  } finally { for (const t of temps) { try { fs.rmSync(t, { force: true }); } catch { /* gone */ } } }
  rows.callersChecked = callersChecked; // how many unchanged callers lane B ran on, for the table's header
  return rows;
}

// the note of a WITNESS row whose difference came through a changed same-file callee (where.cause 'callee'): the callee
// by name, linked to its own row in the same table; a callee whose own row is PASS differs only on the caller's inputs,
// so the caller's row is where the reviewer looks
export function calleeNote(r, rows) {
  const names = (r.witness?.through ?? []).map((t) => t.callee);
  if (!names.length) return null;
  const own = names.map((c) => rows.find((x) => x.file === r.file && x.unit === c)?.verdict ?? null);
  const parts = names.map((c, i) => (own[i] && own[i].startsWith('PASS') ? `${c} (changed), whose own row is ${own[i]}: the difference needs the caller's inputs` : own[i] ? `${c} (changed; its own row is ${own[i]})` : `${c} (changed)`));
  return `through ${parts.join(', ')}; this function's text is unchanged`;
}

export function markdown(rows, base, head) {
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  const lines = [`# lean report: ${base} → ${head}`, '', `${rows.filter((r) => !r.caller).length} changed function(s)${rows.callersChecked ? `; ${rows.callersChecked} unchanged caller(s) checked through lane B, ${rows.filter((r) => r.caller).length} with a WITNESS through a changed callee` : ''}: **${count('IN-SCOPE')} in scope · ${count('WITNESS')} WITNESS · ${count('PASS-proved')} PASS-proved · ${count('PASS-decided')} PASS-decided · ${count('PASS-bounded')} PASS-bounded · ${count('ASK')} ASK · ${count('REFUSE')} REFUSE · ${count('NEW')} NEW**`, '',
    '| file | function | verdict | lane B | lane A | note |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const note = r.verdict === 'WITNESS' && r.witness?.where?.cause === 'callee' ? `input ${r.witness?.input}: ${calleeNote(r, rows)}`.replace(/\|/g, '/') : r.verdict === 'WITNESS' ? `input ${r.witness?.input}: ${r.witness?.where ? r.witness.where.field + (r.witness.where.path ? ' ' + r.witness.where.path : '') : ''}${r.witness?.patchSummary ? '; patch: ' + String(r.witness.patchSummary).replace(/\|/g, '/') : ''}` : (r.reason ? String(r.reason).replace(/\n/g, ' ').slice(0, 90) : '');
    if (r.verdict === 'WITNESS' && r.witness?.args) r.note = note;
    lines.push(`| ${r.file} | \`${r.unit}\` (${r.lines[0]}-${r.lines[1]}) | **${r.verdict}** | ${r.laneB ?? ''} | ${r.laneA ?? ''} | ${note} |`);
  }
  const patched = rows.filter((r) => r.verdict === 'WITNESS' && r.witness?.patch?.length); // a front-end WITNESS: the first three ops of its patch, one per line
  if (patched.length) {
    lines.push('', '## What changed on the page', '');
    for (const r of patched) { lines.push(`### ${r.file} · \`${r.unit}\`: ${r.witness.patchSummary}`, ''); for (const op of r.witness.patch.slice(0, 3)) lines.push(`- \`${formatOp(op).replace(/`/g, "'")}\``); if (r.witness.patch.length > 3) lines.push(`- and ${r.witness.patch.length - 3} more op(s) in the certificate`); lines.push(''); }
  }
  const asks = rows.filter((r) => r.advice && r.advice.length);
  if (asks.length) {
    lines.push('', '## What would make the asks provable', '');
    for (const r of asks) { lines.push(`### ${r.file} · \`${r.unit}\``, ''); for (const a of r.advice) { lines.push(`- line ${a.line}, \`${a.rule}\`: ${a.msg}`); if (a.do) lines.push(`  do: ${a.do}`); } lines.push(''); }
  }
  lines.push('', 'A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const repo = path.resolve(opt('--repo', '.')); const base = opt('--base'); const head = opt('--head', 'WORKTREE');
  if (!base) { console.error('usage: pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--scope f,Class.m,file.ts:f] [--out report.md] [--json report.json]'); process.exit(2); }
  const scope = new Set((opt('--scope', '') || '').split(',').map((x) => x.trim()).filter(Boolean));
  const rows = await prReport({ repo, base, head, n: Number(opt('--n', 100)), dafnySeconds: Number(opt('--dafny-seconds', 30)), project: a.includes('--no-project') ? false : opt('--project', true), scope, filesRoot: opt('--files-root', null), adapters: opt('--adapters') ? JSON.parse(fs.readFileSync(opt('--adapters'), 'utf8')).adapters ?? null : null });
  const md = markdown(rows, base, head);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  if (opt('--out')) { fs.writeFileSync(opt('--out'), md); console.log(`${rows.length} function(s) -> ${opt('--out')}`); } else console.log(md);
}
