#!/usr/bin/env node
// lean pr: a whole change at once. Give it a checkout and two git refs (the base and the head of a pull request, or
// a commit and its parent); it finds every changed function, runs both lanes on each, and prints one report:
// a verdict per function with its certificate pointer, and for every ASK the lint's advice on what to change.
//
//   node pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--out report.md] [--json report.json]
//               [--n 100] [--dafny-seconds 30] [--project <tsconfig>|--no-project]
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
  const { repo, base, head = 'WORKTREE', n = 100, dafnySeconds = 30, project = true, scope = new Set(), filesRoot = null } = opts;
  // filesRoot: a tree that mirrors the checkout (an export of it); the temporary files are written there, so a checkout
  // that must stay untouched is only read through git
  const files = changedRanges(repo, base, head);
  const rows = []; const temps = [];
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
          let b = null; try { b = (await check({ parent: baseFile, candidate: headFile, unit: u.name, n, project, dafnySeconds: 1 })).certificate?.lanes?.B ?? null; } catch { /* keep */ }
          rows.push({ file: rel, unit: u.name, lines: [u.start, u.end], verdict: 'IN-SCOPE', laneB: b?.verdict ?? null, laneA: null, witness: b?.witnesses?.[0] ?? null, reason: b?.verdict === 'WITNESS' ? 'changed as asked: the two versions differ' : b?.verdict === 'PASS-bounded' ? 'declared in scope but no difference found within the bound' : (b?.reason ?? null), advice: [] });
          continue;
        }
        let res;
        try { res = await check({ parent: baseFile, candidate: headFile, unit: u.name, n, project, dafnySeconds }); }
        catch (e) { res = { verdict: 'ASK', certificate: { lanes: { A: { verdict: 'ASK', detail: String(e.message).slice(0, 300) } } } }; }
        const lanes = res.certificate?.lanes ?? {};
        const row = { file: rel, unit: u.name, lines: [u.start, u.end], verdict: res.verdict, laneB: lanes.B?.verdict ?? null, laneA: lanes.A?.verdict ?? null, witness: res.witness ? { input: res.witness.input, args: res.witness.args, where: res.witness.where } : null, reason: lanes.A?.detail ?? lanes.B?.reason ?? null, advice: [] };
        if (res.verdict !== 'PASS-proved' && res.verdict !== 'WITNESS') {
          try { const f = lintFile(headFile, [[u.start, u.end]], { project }); row.advice = f.slice(0, 8).map((x) => ({ line: x.line, rule: x.rule, msg: x.msg, do: x.advice })); } catch { /* none */ }
        }
        rows.push(row);
      }
    }
  } finally { for (const t of temps) { try { fs.rmSync(t, { force: true }); } catch { /* gone */ } } }
  return rows;
}

export function markdown(rows, base, head) {
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  const lines = [`# lean report: ${base} → ${head}`, '', `${rows.length} changed function(s): **${count('IN-SCOPE')} in scope · ${count('WITNESS')} WITNESS · ${count('PASS-proved')} PASS-proved · ${count('PASS-decided')} PASS-decided · ${count('PASS-bounded')} PASS-bounded · ${count('ASK')} ASK · ${count('REFUSE')} REFUSE · ${count('NEW')} NEW**`, '',
    '| file | function | verdict | lane B | lane A | note |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const note = r.verdict === 'WITNESS' ? `input ${r.witness?.input}: ${r.witness?.where ? r.witness.where.field + (r.witness.where.path ? ' ' + r.witness.where.path : '') : ''}` : (r.reason ? String(r.reason).replace(/\n/g, ' ').slice(0, 90) : '');
    if (r.verdict === 'WITNESS' && r.witness?.args) r.note = note;
    lines.push(`| ${r.file} | \`${r.unit}\` (${r.lines[0]}-${r.lines[1]}) | **${r.verdict}** | ${r.laneB ?? ''} | ${r.laneA ?? ''} | ${note} |`);
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
  const rows = await prReport({ repo, base, head, n: Number(opt('--n', 100)), dafnySeconds: Number(opt('--dafny-seconds', 30)), project: a.includes('--no-project') ? false : opt('--project', true), scope, filesRoot: opt('--files-root', null) });
  const md = markdown(rows, base, head);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  if (opt('--out')) { fs.writeFileSync(opt('--out'), md); console.log(`${rows.length} function(s) -> ${opt('--out')}`); } else console.log(md);
}
