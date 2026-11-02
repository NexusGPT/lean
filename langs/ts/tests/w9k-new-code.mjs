#!/usr/bin/env node
// The w9k pair and its breaks: outcome facts of a unit no parent holds (exec/new-unit.mjs unitWorld, nanAt,
// parameterTrials; pr.mjs keeps them under a lint finding).
//   node langs/ts/tests/w9k-new-code.mjs            the pair passes with its mechanisms
//   node langs/ts/tests/w9k-new-code.mjs --pr       pr.mjs on a repository whose head adds a unit, under a lint finding,
//                                                   to a file the base holds: the row carries the unit's records
//   node langs/ts/tests/w9k-new-code.mjs --break    the pair once per mechanism, that mechanism switched off
//                                                   (LEAN_BREAK=<mechanism>), and the --pr check under findings-records:
//                                                   every one must turn red
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = { new_unit_facts: ['unit-reach', 'real-buffer', 'nan-fact', 'ignored-param', 'fault-origin', 'undefined-global', 'trials-constant'] };
const brk = process.argv.includes('--break');
if (process.argv.includes('--pr')) process.exit(prCheck(null) ? 0 : 1);
if (process.argv.includes('--typed')) process.exit((await typedCheck(brk ? 'typed-own-first' : null)) === !brk ? 0 : 1);
let bad = 0;
for (const [pair, mechanisms] of Object.entries(PAIRS)) {
  for (const mechanism of brk ? mechanisms : [null]) {
    const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
    delete env.LEAN_PAIRS;
    const r = spawnSync('node', [path.join(here, 'run.mjs'), '--pair', pair], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    const total = /\| TOTAL \| (\d+) checks \| (?:(\d+) FAILED|ALL PASS)/.exec(out);
    const failed = total ? Number(total[2] ?? 0) : null;
    const ok = failed !== null && (mechanism ? failed > 0 : failed === 0);
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${pair}${mechanism ? ` (LEAN_BREAK=${mechanism})` : ''}: ${total ? `${total[1]} checks, ${failed} failed` : `no TOTAL line (exit ${r.status})`}`);
    if (!ok || mechanism) for (const ln of out.split('\n').filter((l) => /\| FAIL \|/.test(l)).slice(0, 8)) console.log(`     ${ln.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
}
if (brk && process.argv.length === 3) { const green = await typedCheck('typed-own-first'); if (green) bad++; console.log(`${green ? 'FAIL' : 'ok  '} typed (LEAN_BREAK=typed-own-first): ${green ? 'still green' : 'red'}`); }
if (brk && process.argv.length === 3) { const green = prCheck('lint-wanted'); if (green) bad++; console.log(`${green ? 'FAIL' : 'ok  '} pr (LEAN_BREAK=lint-wanted): ${green ? 'still green' : 'red'}`); }
if (brk) { const green = prCheck('findings-records'); if (green) bad++; console.log(`${green ? 'FAIL' : 'ok  '} pr (LEAN_BREAK=findings-records): ${green ? 'still green' : 'red'}`); }
console.log(bad ? `${bad} run(s) wrong` : brk ? 'every break turns red' : 'the pair is green');
process.exit(bad ? 1 : 0);

// pr.mjs on a unit added to a file the base holds, under a lint finding (`===` on two arrays: reference-equality), run
// with --units naming it among three changed units: before lane w9k its row was the finding's, without the records
// lane B read, and the lint ran on every unit of the file (report.linted, LEAN_BREAK=lint-wanted)
function prCheck(mechanism) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-w9k-pr-'));
  const repo = path.join(tmp, 'repo');
  const git = (...a) => { const r = spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@example.invalid', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@example.invalid' } }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); fs.writeFileSync(path.join(repo, rel), text); };
  try {
    fs.mkdirSync(repo, { recursive: true });
    git('init', '-q');
    write('package.json', '{ "name": "w9k-pr" }\n');
    write('src/list.ts', 'export function kept(n: number): number { return n; }\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    write('src/list.ts', 'export function kept(n: number): number { return n + 1; }\nexport function grow(xs: string[] | undefined, ys: string[]): boolean { return xs === ys || xs!.length === 0; }\nexport function other(s: string): string { return s.trim(); }\n');
    git('add', '-A'); git('commit', '-q', '-m', 'head');
    const head = git('rev-parse', 'HEAD');
    const json = path.join(tmp, 'report.json'), md = path.join(tmp, 'report.md');
    const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
    const r = spawnSync(process.execPath, [path.join(here, '../pr.mjs'), '--repo', repo, '--base', base, '--head', head, '--no-project', '--n', '30', '--dafny-seconds', '1', '--json', json, '--out', md, '--units', 'src/list.ts::grow'], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
    if (r.status !== 0) { console.log(`FAIL pr.mjs exited ${r.status}: ${(r.stderr ?? '').slice(-600)}`); return false; }
    const report = JSON.parse(fs.readFileSync(json, 'utf8')), rows = report.rows;
    const row = rows.find((x) => x.file === 'src/list.ts' && x.unit === 'grow');
    const checks = [
      ['grow is read under its lint finding', !!row && String(row.coverage).startsWith('refused:')],
      ['grow is NEW', row?.verdict === 'NEW'],
      ['--units grow: grow alone is linted of the three changed units', report.linted === 1 && !rows.some((x) => x.unit === 'kept' || x.unit === 'other')],
      ['grow keeps its new:fault on undefined', !!row?.records?.some((x) => x.kind === 'new:fault' && JSON.stringify(x.args?.[0]) === '{"$undefined":true}')],
    ];
    if (!mechanism) for (const [name, ok] of checks) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    const wrong = checks.filter(([, ok]) => !ok).length;
    if (wrong && !mechanism) console.log(JSON.stringify(rows.map((x) => ({ file: x.file, unit: x.unit, verdict: x.verdict, coverage: x.coverage, reason: x.reason, records: x.records?.map((y) => y.kind) }))).slice(0, 1500));
    if (!mechanism) console.log(wrong ? `${wrong} pr check(s) wrong` : 'a unit added under a lint finding keeps its records');
    return wrong === 0;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// typed.mjs on a three-file project (lane w9k ownFirst): a runtime change of a.ts is decided on a.ts's own emit (files 1,
// own), its importer b.ts never read; a type-only change still takes the full reading and is PASS-typed (equal, files 2:
// a.ts and its importer); in a file with a runtime unit and an annotation-only unit, the annotation unit's own reading is
// still made (equal). Under LEAN_BREAK=typed-own-first the first check fails (the full reading reads 2 files)
async function typedCheck(mechanism) {
  if (mechanism) process.env.LEAN_BREAK = mechanism;
  const { typedReading } = await import('../typed.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-w9k-typed-'));
  try {
    const w = (rel, text) => fs.writeFileSync(path.join(tmp, rel), text);
    w('tsconfig.json', '{ "compilerOptions": { "strict": true, "module": "esnext", "target": "es2020" }, "include": ["*.ts"] }\n');
    const a0 = 'export function f(x: number): number { return x + 1; }\nexport function g(s: string): string { return s; }\n';
    w('a.ts', a0); w('b.ts', 'import { f } from "./a";\nexport const y = f(1);\n'); w('c.ts', 'export const z = 3;\n');
    const runtime = 'export function f(x: number): number { return x + 2; }\nexport function g(s: string): string { return s; }\n';
    const typeOnly = 'export function f(x: number): number { return x + 1; }\nexport function g(s: string): string | number { return s; }\n';
    const both = 'export function f(x: number): number { return x + 2; }\nexport function g(s: string): string | number { return s; }\n';
    const r1 = typedReading({ root: tmp, changes: [{ rel: 'a.ts', parent: a0, head: runtime }] }).get('a.ts');
    const r2 = typedReading({ root: tmp, changes: [{ rel: 'a.ts', parent: a0, head: typeOnly }] }).get('a.ts');
    const r3 = typedReading({ root: tmp, changes: [{ rel: 'a.ts', parent: a0, head: both, units: ['f', 'g'] }] }).get('a.ts');
    const checks = [
      ['a runtime change is decided on its own emit', r1?.equal === false && r1?.files === 1 && r1?.own === true],
      ['a type-only change is PASS-typed by the full reading', r2?.equal === true && r2?.files === 2],
      ['an annotation unit beside a runtime unit is still read alone', r3?.equal === false && r3?.units?.g?.equal === true && r3?.units?.f?.equal === false],
    ];
    if (!mechanism) for (const [name, ok] of checks) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    if (!mechanism && checks.some(([, ok]) => !ok)) console.log(JSON.stringify({ r1, r2, r3 }).slice(0, 1200));
    return checks.every(([, ok]) => ok);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); if (mechanism) delete process.env.LEAN_BREAK; }
}
