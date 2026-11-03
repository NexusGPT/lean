#!/usr/bin/env node
// The w9ab checks: a unit whose run never finished because a world call never settled (design/world-calls.md).
//   await-units  exec/new-unit.mjs loadCandidate: a unit no parent holds, in a script whose top level asks a server and
//                polls it (cline#13799 repro-cloud-session.mjs). Its module is evaluated up to its first pending await,
//                a rejection after that await is the body's, and an input whose drawn world the script refuses (its token
//                absent) is skipped and counted. Its check: fixtures/w9ab-world-calls/script.mjs, unit request, is NEW
//                with the body and the refused worlds in its bound; under the break, the load's ASK.
//   world-clock  exec/run.mjs awaitUnit onClock: a promise no world call settles stops the input at once, its reason
//                naming the await site and the last world call. Its check: fixtures/w9ab-world-calls/never.ts, unit
//                never, ASK with that reason; under the break the reason names no await site.
//   reason-names pr.mjs checkoutNamed: a row's reason names the file by its checkout path, never the temporary copy the run
//                read it from (the three cline#13799 rows named .lean-run/runs/<run>/sources/.../.lean_head_<pid>_<file>).
// The pair world_await holds the other half of each mechanism (its break rows: tests/lib-break.mjs --pair world_await).
//
//   node tests/w9ab-world-calls.mjs           each check green
//   node tests/w9ab-world-calls.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutNamed } from '../pr.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'fixtures', 'w9ab-world-calls');
const brk = process.argv.includes('--break');

function lean(args, mechanism) {
  const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
  const r = spawnSync('node', [path.join(here, '..', 'check.mjs'), ...args, '--no-project'], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout); } catch { return { verdict: `unparsed (exit ${r.status})`, certificate: { lanes: { B: { reason: String(r.stderr).slice(-300) } } } }; }
}

const checks = [
  ['await-units', 'a new unit of a script that awaits the world at its top level runs', (m) => {
    const r = lean(['--candidate', path.join(fixtures, 'script.mjs'), '--unit', 'request', '--n', '12'], m);
    const b = r.certificate?.lanes?.B ?? {}, bound = b.bound ?? {};
    const ok = r.verdict === 'NEW' && !!bound.moduleBody && (bound.refusedWorlds?.inputs ?? 0) > 0 && bound.refusedWorlds.inputs < 12;
    return { ok, detail: `${r.verdict}; body ${JSON.stringify(bound.moduleBody ?? null)}; refused ${bound.refusedWorlds?.inputs ?? 0} of 12${ok ? '' : `; ${String(b.reason).slice(0, 200)}`}` };
  }],
  ['world-clock', 'a promise no world call settles is named at its await', (m) => {
    const f = path.join(fixtures, 'never.ts');
    const t0 = Date.now();
    const r = lean(['--parent', f, '--candidate', f, '--unit', 'never', '--n', '2'], m);
    const reason = String(r.certificate?.lanes?.B?.reason ?? '');
    const ok = r.certificate?.lanes?.B?.verdict === 'ASK' && /unsettled: the unit awaits at never\.ts:4 `await new Promise\(\(\) => \{\}\);`/.test(reason) && /last world call: call global:fetch/.test(reason);
    return { ok, detail: `${r.certificate?.lanes?.B?.verdict}: ${reason.slice(0, 220)} (${Math.round((Date.now() - t0) / 1000)} s)` };
  }],
  ['reason-names', 'a row\'s reason names the checkout file', (m) => {
    const saved = process.env.LEAN_BREAK; if (m) process.env.LEAN_BREAK = m; else delete process.env.LEAN_BREAK;
    try {
      const rel = 'apps/vscode/scripts/repro-cloud-session.mjs';
      const got = checkoutNamed('/w/ck/a#1~m1/lean/a#1~m1/.lean-run/runs/run-lVB1Lf/sources/apps/vscode/scripts/.lean_head_2682037_repro-cloud-session.mjs: ASK(fake answering at module evaluation): POST /api/v1/session returned 404: 0', rel);
      const other = checkoutNamed('/w/src/.lean_base_11_other.ts: x', rel); // another file's copy is not this row's file
      const bare = checkoutNamed('names fetch (.lean_head_3303844_repro-cloud-session.mjs:13); a module binding', rel); // a site's file, its bare name
      const ok = got === `${rel}: ASK(fake answering at module evaluation): POST /api/v1/session returned 404: 0` && other === '/w/src/.lean_base_11_other.ts: x' && bare === `names fetch (${rel}:13); a module binding`;
      return { ok, detail: got.slice(0, 120) };
    } finally { if (saved === undefined) delete process.env.LEAN_BREAK; else process.env.LEAN_BREAK = saved; }
  }],
];

let red = 0;
for (const [mechanism, what, run] of checks) {
  const r = run(brk ? mechanism : null);
  const pass = brk ? !r.ok : r.ok;
  if (!pass) red++;
  console.log(`| ${mechanism} | ${what} | ${brk ? `LEAN_BREAK=${mechanism}: ` : ''}${r.detail} | ${pass ? (brk ? 'RED as it must be' : 'PASS') : 'FAIL'} |`);
}
console.log(`w9ab-world-calls${brk ? ' --break' : ''}: ${checks.length} checks, ${red} failed`);
process.exit(red ? 1 : 0);
