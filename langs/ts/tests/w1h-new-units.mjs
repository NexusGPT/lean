#!/usr/bin/env node
// The w1h pairs and their breaks (design/w1h-new-units.md).
//   node langs/ts/tests/w1h-new-units.mjs            each pair passes with its mechanisms
//   node langs/ts/tests/w1h-new-units.mjs --pr       pr.mjs on a repository whose head adds a file and its test: the added
//                                                    file's units are NEW with their records, and the report shows them
//   node langs/ts/tests/w1h-new-units.mjs --break    each pair once per mechanism, that mechanism switched off
//                                                    (LEAN_BREAK=<mechanism>, read by exec/declared.mjs, exec/new-unit.mjs,
//                                                    exec/new-tests.mjs): every one must turn its pair red
// A mechanism the pair does not need would leave the pair green under --break: the test then fails, so every pair is
// shown to rest on each mechanism it names.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = {
  new_unit_fault: ['declared-edges', 'declared-throws', 'admitted-input', 'closed-call'],
  new_unit_shape: ['declared-shape', 'shape-drives'],
  new_unit_test: ['pr-tests', 'closed-test', 'platform-gap'],
};
if (process.argv.includes('--pr')) process.exit(prCheck());
const brk = process.argv.includes('--break');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let bad = 0;
for (const [pair, mechanisms] of Object.entries(PAIRS)) {
  if (only.length && !only.includes(pair)) continue;
  for (const mechanism of brk ? mechanisms : [null]) {
    const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
    delete env.LEAN_PAIRS;
    const r = spawnSync('node', [path.join(here, 'run.mjs'), '--pair', pair], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    const total = /\| TOTAL \| (\d+) checks \| (?:(\d+) FAILED|ALL PASS)/.exec(out);
    const failed = total ? Number(total[2] ?? 0) : null;
    const ok = failed !== null && (mechanism ? failed > 0 : failed === 0);
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${pair}${mechanism ? ` (LEAN_BREAK=${mechanism})` : ''}: ${total ? `${total[1]} checks, ${failed} failed` : 'no TOTAL line'}`);
    if (!ok || mechanism) for (const ln of out.split('\n').filter((l) => /\| FAIL \|/.test(l)).slice(0, 8)) console.log(`     ${ln.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
}
console.log(bad ? `${bad} run(s) wrong` : brk ? 'every break turns its pair red' : 'every pair green');
process.exit(bad ? 1 : 0);

// pr.mjs on an added file: before this lane its units were ASK `new file: no parent to compare with`, never run
function prCheck() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-w1h-pr-'));
  const repo = path.join(tmp, 'repo');
  const git = (...a) => { const r = spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@example.invalid', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@example.invalid' } }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); fs.writeFileSync(path.join(repo, rel), text); };
  try {
    fs.mkdirSync(repo, { recursive: true });
    git('init', '-q');
    write('package.json', '{ "name": "w1h-pr", "devDependencies": { "vitest": "1.0.0" } }\n');
    write('src/kept.ts', 'export function kept(n: number): number { return n; }\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    write('src/added.ts', 'export function initial(name: string | undefined): string { return name!.charAt(0).toUpperCase(); }\nexport function sum(xs: number[]): number { return xs.reduce((a, b) => a + b, 1); }\n');
    write('src/added.test.ts', 'import { expect, it } from "vitest";\nimport { sum } from "./added";\nit("sums", () => { expect(sum([1, 2])).toBe(3); });\n');
    git('add', '-A'); git('commit', '-q', '-m', 'head');
    const head = git('rev-parse', 'HEAD');
    const json = path.join(tmp, 'report.json'), md = path.join(tmp, 'report.md');
    const r = spawnSync(process.execPath, [path.join(here, '../pr.mjs'), '--repo', repo, '--base', base, '--head', head, '--no-project', '--n', '30', '--dafny-seconds', '1', '--json', json, '--out', md], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) { console.log(`FAIL pr.mjs exited ${r.status}: ${(r.stderr ?? '').slice(-600)}`); return 1; }
    const rows = JSON.parse(fs.readFileSync(json, 'utf8')).rows;
    const row = (unit) => rows.find((x) => x.file === 'src/added.ts' && x.unit === unit);
    const report = fs.readFileSync(md, 'utf8');
    const checks = [
      ['initial is NEW', row('initial')?.verdict === 'NEW'],
      ['initial has new:fault on undefined', !!row('initial')?.records?.some((x) => x.kind === 'new:fault' && JSON.stringify(x.args) === '[{"$undefined":true}]')],
      ['sum has new:test from the added test', !!row('sum')?.records?.some((x) => x.kind === 'new:test' && x.test === 'sums')],
      ['the certificate carries newUnit', !!row('sum')?.certificate?.newUnit?.records?.length],
      ['the report has the section', report.includes('## New units against their declarations') && report.includes('`new:test` added.test.ts `sums` fails')],
    ];
    for (const [name, ok] of checks) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    const bad = checks.filter(([, ok]) => !ok).length;
    if (bad) console.log(JSON.stringify(rows.map((x) => ({ file: x.file, unit: x.unit, verdict: x.verdict, reason: x.reason, records: x.records?.map((y) => y.kind) }))).slice(0, 1500));
    console.log(bad ? `${bad} pr check(s) wrong` : 'an added file\'s units are read against their declarations');
    return bad ? 1 : 0;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
