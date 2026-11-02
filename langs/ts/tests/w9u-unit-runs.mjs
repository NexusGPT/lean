#!/usr/bin/env node
// The w9u checks: two of the easy-set units lean never finished, each mechanism with a check that its break turns red.
//   jsdoc-unnamed-param  translate/translate.mjs collectAssertionWrites: a call resolved to a JSDoc function type
//                        (`@return {function(number): number}`) hands its arguments to parameters that bind no name; the
//                        file-wide scan read the undefined name and crashed, refusing every unit of the file
//                        (three.js#35267 PointShadowNode.js). Its check: the pair w9u_jsdoc_function_type (pr.mjs rows).
//   w9u-units-lint       pr.mjs changedUnits: a routed unit --units leaves out is named, never linted (it gets no task and
//                        no row). Checkmate#3797: one 51-line unit asked for, 322 s spent translating the 156 callbacks of
//                        a 1386-line test file the PR also changed. Its check: tests/fixtures/w9f-lint, f1, f2, f3 routed
//                        and f1 listed: one span linted, all three named, f1's findings as when every unit is linted.
//
//   node tests/w9u-unit-runs.mjs           each check green
//   node tests/w9u-unit-runs.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProgram } from '../common.mjs';
import { changedUnits } from '../pr.mjs';
import { lintStats } from '../lint/lint.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const brk = process.argv.includes('--break');

function pairCheck(pair, mechanism) {
  const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
  delete env.LEAN_PAIRS;
  const r = spawnSync('node', [path.join(here, 'run.mjs'), '--pair', pair], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const total = /\| TOTAL \| (\d+) checks \| (?:(\d+) FAILED|ALL PASS)/.exec(out);
  const failed = total ? Number(total[2] ?? 0) : null;
  return { green: failed === 0, detail: total ? `${total[1]} checks, ${failed} failed` : `no TOTAL line (exit ${r.status})`, fails: out.split('\n').filter((l) => /\| FAIL \|/.test(l)).slice(0, 4) };
}

function unitsLintCheck(mechanism) {
  const fixture = path.join(here, 'fixtures', 'w9f-lint', 'src', 'm.ts');
  const loaded = loadProgram(fixture, { project: true });
  const saved = process.env.LEAN_BREAK;
  if (mechanism) process.env.LEAN_BREAK = mechanism; else delete process.env.LEAN_BREAK;
  try {
    const rules = (us) => JSON.stringify(us.map((u) => [u.name, (u.findings ?? []).map((x) => [x.rule, x.line])]));
    const routed = new Set(['f1', 'f2', 'f3']);
    Object.assign(lintStats, { calls: 0, spans: 0 });
    const got = changedUnits(loaded, [[1, Infinity]], fixture, routed, (name) => name === 'f1');
    const spans = lintStats.spans;
    const every = changedUnits(loaded, [[1, Infinity]], fixture, routed).filter((u) => u.name === 'f1');
    const names = got.map((u) => u.name).sort().join(',');
    const sameF1 = rules(got.filter((u) => u.name === 'f1')) === rules(every);
    return { green: spans === 1 && names === 'f1,f2,f3' && sameF1, detail: `spans linted ${spans} (want 1), units named ${names} (want f1,f2,f3), f1's findings ${sameF1 ? 'as' : 'NOT as'} when every unit is linted ${rules(every)}` };
  } finally { if (saved === undefined) delete process.env.LEAN_BREAK; else process.env.LEAN_BREAK = saved; }
}

const CHECKS = [
  { name: 'pair w9u_jsdoc_function_type', mechanism: 'jsdoc-unnamed-param', run: (m) => pairCheck('w9u_jsdoc_function_type', m) },
  { name: 'changedUnits --units lints the listed units only', mechanism: 'w9u-units-lint', run: (m) => unitsLintCheck(m) },
];
let bad = 0;
for (const c of CHECKS) {
  const r = c.run(brk ? c.mechanism : null);
  const ok = brk ? !r.green : r.green;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name}${brk ? ` (LEAN_BREAK=${c.mechanism})` : ''}: ${r.detail}`);
  for (const ln of r.fails ?? []) console.log(`     ${ln.replace(/\s+/g, ' ').slice(0, 220)}`);
}
console.log(bad ? `${bad} check(s) wrong` : brk ? 'every break turns its check red' : 'every check green');
process.exit(bad ? 1 : 0);
