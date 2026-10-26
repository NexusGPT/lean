#!/usr/bin/env node
// lean check: one unit, parent against candidate, both lanes, one verdict with its certificate.
//
//   node check.mjs --parent <file.ts> --candidate <file.ts> --unit <name|Class.method> [--out verdict.json]
//                  [--n 200] [--seed 1] [--project <tsconfig>|--no-project] [--dafny-seconds 60] [--scope scope.json]
//
// Order: lane B (bounded execution) first; a WITNESS ends the question. Then lane A (proof): lint, translate both
// sides (the effect set shared), theorem, Dafny. The verdict is the strongest statement the evidence supports:
//   WITNESS       > PASS-proved > PASS-bounded > ASK
// A PASS-bounded never becomes a proof; a proof lemma that fails is ASK:unproved (not a refutation).
// The certificate lists what was checked: file hashes, the unit, the bound, the theorem and prelude hashes, the
// Dafny and Z3 versions, the time limit, and the lemma results, so a reader can re-run every step.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runPair } from './exec/run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = (p) => (fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) : null);
const snake = (n) => n.replace('.', '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const run = (cmd, args, timeoutMs) => { const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: timeoutMs }); return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), timedOut: !!r.error && r.error.code === 'ETIMEDOUT' }; };

export async function check(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, project = true, dafnySeconds = 60, scope = null } = opts;
  const cert = { tool: 'lean-ts v3', unit, parent: { file: parent, sha256: sha(parent) }, candidate: { file: candidate, sha256: sha(candidate) }, lanes: {} };
  // ---- lane B ----
  const b = await runPair({ parent, candidate, unit, n, seed, project });
  cert.lanes.B = { verdict: b.verdict, reason: b.reason ?? null, bound: b.bound ?? null, witnesses: b.witnesses ? b.witnesses.map((w) => ({ input: w.input, args: w.args, where: w.where })) : null };
  if (b.verdict === 'WITNESS') return finish('WITNESS', cert, { witness: b.witnesses[0] });
  // ---- lane A ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-check-'));
  const tr = (file, suffix, eff) => run('node', [path.join(here, 'translate/translate.mjs'), file, '--core', '--only', unit, '--suffix', suffix, '--out', path.join(tmp, `${suffix}.dfy`), '--prelude', path.join(tmp, `${suffix}.pre.dfy`), ...(project === false ? ['--no-project'] : typeof project === 'string' ? ['--project', project] : []), ...(eff ? ['--effectful', eff] : [])], 120000);
  const effOf = (suffix) => { const p = path.join(tmp, `${suffix}.dfy`); if (!fs.existsSync(p)) return ''; const m = fs.readFileSync(p, 'utf8').match(/^\/\/ EFFECTFUL: (.*)$/m); return m ? m[1].trim() : ''; };
  const p1 = tr(parent, 'parent', '');
  if (p1.status !== 0) { cert.lanes.A = { verdict: 'ASK', stage: 'translate-parent', detail: p1.out.trim().slice(-600) }; return finish(b.verdict === 'PASS-bounded' ? 'PASS-bounded' : 'ASK', cert, {}); }
  const c1 = tr(candidate, 'candidate', effOf('parent'));
  if (c1.status !== 0) { cert.lanes.A = { verdict: 'ASK', stage: 'translate-candidate', detail: c1.out.trim().slice(-600) }; return finish(b.verdict === 'PASS-bounded' ? 'PASS-bounded' : 'ASK', cert, {}); }
  if (effOf('candidate') !== effOf('parent')) tr(parent, 'parent', effOf('candidate'));
  const cand = fs.readFileSync(path.join(tmp, 'candidate.dfy'), 'utf8');
  const names = [...new Set([...cand.matchAll(/\bfunction\s+([A-Za-z0-9_]+)_candidate\s*\(/g)].map((m) => m[1]))].filter((x) => !/_loop\d+$/.test(x));
  const scopeObj = scope ? JSON.parse(fs.readFileSync(scope, 'utf8')) : { functions: Object.fromEntries(names.map((x) => [x, { in_scope: 'false' }])) };
  fs.writeFileSync(path.join(tmp, 'scope.json'), JSON.stringify(scopeObj)); fs.writeFileSync(path.join(tmp, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(here, '../../spec/theorem.py'), '--parent', path.join(tmp, 'parent.dfy'), '--candidate', path.join(tmp, 'candidate.dfy'), '--scope', path.join(tmp, 'scope.json'), '--edit', path.join(tmp, 'edit.json'), '--out', path.join(tmp, 'theorem.dfy')], 60000);
  if (th.status !== 0) {
    const why = th.out.trim().slice(-400);
    const iface = /differs|does not define|opaque block calls/.test(why);
    cert.lanes.A = { verdict: iface ? 'ASK:interface' : 'ASK:theorem', detail: why };
    return finish(iface ? 'ASK' : (b.verdict === 'PASS-bounded' ? 'PASS-bounded' : 'ASK'), cert, {});
  }
  const v = run('dafny', ['verify', '--verification-time-limit', String(dafnySeconds), path.join(tmp, 'theorem.dfy')], (dafnySeconds + 60) * 1000 * Math.max(1, names.length));
  const text = v.out;
  const m = text.match(/finished with (\d+) verified, (\d+) error/);
  const lines = fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const mm = ln.match(/^lemma (Equal_\w+)\(/); if (mm) { cur = mm[1]; spans[cur] = [i + 1, null]; } if (ln.startsWith('} // END Equal_') && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((x) => Number(x[1]));
  const lemmas = Object.fromEntries(Object.entries(spans).map(([k, [a, bb]]) => [k, !errs.some((L) => a <= L && L <= bb)]));
  const main = `Equal_${snake(unit)}`;
  cert.lanes.A = { verdict: m ? (lemmas[main] ? 'PASS-proved' : 'ASK:unproved') : (v.timedOut ? 'ASK:timeout' : 'ASK:translation-defect'), lemmas, dafny: (text.match(/Dafny program verifier finished[^\n]*/) || [''])[0], theoremSha256: sha(path.join(tmp, 'theorem.dfy')), preludeSha256: sha(path.join(tmp, 'candidate.pre.dfy')), dafnyVersion: run('dafny', ['--version'], 20000).out.trim(), timeLimitSeconds: dafnySeconds, dir: tmp };
  if (m && lemmas[main]) return finish('PASS-proved', cert, {});
  return finish(b.verdict === 'PASS-bounded' ? 'PASS-bounded' : 'ASK', cert, {});
}
function finish(verdict, cert, extra) { return { verdict, ...extra, certificate: cert }; }

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const res = await check({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), project: a.includes('--no-project') ? false : opt('--project', true), dafnySeconds: Number(opt('--dafny-seconds', 60)), scope: opt('--scope', null) });
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) { fs.writeFileSync(out, text); console.log(`${res.verdict} -> ${out}`); } else console.log(text);
}
