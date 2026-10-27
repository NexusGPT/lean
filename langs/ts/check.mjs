#!/usr/bin/env node
// lean check: one unit, parent against candidate, both lanes, one verdict with its certificate.
//
//   node check.mjs --parent <file.ts> --candidate <file.ts> --unit <name|Class.method> [--out verdict.json]
//                  [--n 200] [--seed 1] [--project <tsconfig>|--no-project] [--dafny-seconds 60] [--scope scope.json]
//
// Order: lane B (bounded execution) first; a WITNESS ends the question. Then lane A (proof): lint, translate both
// sides (the effect set shared), theorem, Dafny. The verdict is the strongest statement the evidence supports:
//   WITNESS       > PASS-proved > PASS-decided > PASS-bounded > ASK
//   PASS-decided: a component whose state and props are finite by its types, the product of both state spaces explored to the end.
//   NEW and REFUSE(load) are candidate-only observations, outside the equality ordering.
// A PASS-bounded never becomes a proof; a proof lemma that fails is ASK:unproved (not a refutation).
// The certificate lists what was checked: file hashes, the unit, the bound, the theorem and prelude hashes, the
// Dafny and Z3 versions, the time limit, and the lemma results, so a reader can re-run every step.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runPair, crumb, crumbText, verdictGuard } from './exec/run.mjs';
import { formatOp } from './patch.mjs';
import { unitTextEqual } from './exec/callees.mjs';
import { rowById, rowStatus, rowContradicted } from './decorators.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = (p) => (p && fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) : null);
const snake = (n) => n.replace('.', '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const run = (cmd, args, timeoutMs) => { const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: timeoutMs }); return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), timedOut: !!r.error && r.error.code === 'ETIMEDOUT' }; };

export async function check(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, project = true, dafnySeconds = 60, scope = null, deep = false } = opts;
  const cert = { tool: 'lean-ts v3', unit, parent: { file: parent, sha256: sha(parent) }, candidate: { file: candidate, sha256: sha(candidate) }, lanes: {} };
  // ---- lane B ----
  const b = await runPair({ parent, candidate, unit, n, seed, project, deep });
  crumb.phase = 'lane A'; crumb.input = null;
  cert.lanes.B = { verdict: b.verdict, reason: b.reason ?? null, bound: b.bound ?? null, witnesses: b.witnesses ? b.witnesses.map((w) => ({ input: w.input, args: w.args, where: w.where, ...(w.through ? { through: w.through } : {}) })) : null };
  try { cert.unitTextEqual = b.unitTextEqual ?? unitTextEqual(parent, candidate, unit); } catch { cert.unitTextEqual = null; } // the unit's own text, comments and whitespace dropped, equal on both sides or not: beside the file hashes, it says whether a difference came through this function's text or through what it calls
  cert.observation = b.bound?.frontEnd ? { ...b.bound.frontEnd } : { layer: 'values and the reachable object graph', renders: null, effects: 'the trace of environment requests and pending work', schedule: 'synchronous; pending work recorded, never fired' }; // every verdict names its layer (research 18, 19)
  if (b.verdict === 'NEW' || b.verdict === 'REFUSE' || b.candidateOnly) { cert.lanes.B = b; return finish(b.verdict, cert, b); }
  if (b.verdict === 'WITNESS') return finish('WITNESS', cert, { witness: b.witnesses[0] });
  if (b.bound?.library) cert.library = { records: b.bound.library.records, ops: b.bound.library.ops, outOfModel: b.bound.library.outOfModel, callbackEffects: b.bound.library.callbackEffects, defects: b.bound.library.defects.length }; // the library table validated by this run
  const bounded = b.verdict === 'PASS-decided' ? 'PASS-decided' : 'PASS-bounded'; // the rung lane B reached: decided (a finite component over every click order) outranks bounded
  // ---- lane A ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-check-'));
  // the heap core (references, layer 2) is on: a unit over plain records and arrays is read through one heap; the core is agreed on both sides like EFFECTFUL, since a unit in the core on one side only would change its signature
  const tr = (file, suffix, eff, heapUnits) => run('node', [path.join(here, 'translate/translate.mjs'), file, '--core', '--only', unit, '--suffix', suffix, '--out', path.join(tmp, `${suffix}.dfy`), '--prelude', path.join(tmp, `${suffix}.pre.dfy`), ...(project === false ? ['--no-project'] : typeof project === 'string' ? ['--project', project] : []), '--heap', ...(eff ? ['--effectful', eff] : []), ...(heapUnits !== undefined ? ['--heap-units', heapUnits || '-'] : [])], 120000);
  const headerOf = (suffix, key) => { const p = path.join(tmp, `${suffix}.dfy`); if (!fs.existsSync(p)) return ''; const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^// ${key}: (.*)$`, 'm')); return m ? m[1].trim() : ''; };
  const effOf = (suffix) => headerOf(suffix, 'EFFECTFUL');
  const heapOf = (suffix) => headerOf(suffix, 'HEAP');
  const p1 = tr(parent, 'parent', '', undefined);
  if (p1.status !== 0) { cert.lanes.A = { verdict: 'ASK', stage: 'translate-parent', detail: p1.out.trim().slice(-600) }; return finish((b.verdict === 'PASS-bounded' || b.verdict === 'PASS-decided') ? bounded : 'ASK', cert, {}); }
  const c1 = tr(candidate, 'candidate', effOf('parent'), heapOf('parent'));
  if (c1.status !== 0) { cert.lanes.A = { verdict: 'ASK', stage: 'translate-candidate', detail: c1.out.trim().slice(-600) }; return finish((b.verdict === 'PASS-bounded' || b.verdict === 'PASS-decided') ? bounded : 'ASK', cert, {}); }
  if (effOf('candidate') !== effOf('parent') || heapOf('candidate') !== heapOf('parent')) tr(parent, 'parent', effOf('candidate'), heapOf('candidate'));
  const cand = fs.readFileSync(path.join(tmp, 'candidate.dfy'), 'utf8');
  const names = [...new Set([...cand.matchAll(/\bfunction\s+([A-Za-z0-9_]+)_candidate\s*\(/g)].map((m) => m[1]))].filter((x) => !/_loop\d+$/.test(x));
  const scopeObj = scope ? JSON.parse(fs.readFileSync(scope, 'utf8')) : { functions: Object.fromEntries(names.map((x) => [x, { in_scope: 'false' }])) };
  fs.writeFileSync(path.join(tmp, 'scope.json'), JSON.stringify(scopeObj)); fs.writeFileSync(path.join(tmp, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(here, '../../spec/theorem.py'), '--parent', path.join(tmp, 'parent.dfy'), '--candidate', path.join(tmp, 'candidate.dfy'), '--scope', path.join(tmp, 'scope.json'), '--edit', path.join(tmp, 'edit.json'), '--out', path.join(tmp, 'theorem.dfy')], 60000);
  if (th.status !== 0) {
    const why = th.out.trim().slice(-400);
    const iface = /differs|does not define|opaque block calls/.test(why);
    cert.lanes.A = { verdict: iface ? 'ASK:interface' : 'ASK:theorem', detail: why };
    return finish(iface ? 'ASK' : ((b.verdict === 'PASS-bounded' || b.verdict === 'PASS-decided') ? bounded : 'ASK'), cert, {});
  }
  const v = run('dafny', ['verify', '--verification-time-limit', String(dafnySeconds), path.join(tmp, 'theorem.dfy')], (dafnySeconds + 60) * 1000 * Math.max(1, names.length));
  const text = v.out;
  const m = text.match(/finished with (\d+) verified, (\d+) error/);
  const lines = fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const mm = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon)?_\w+)\(/); if (mm) { cur = mm[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((x) => Number(x[1]));
  const lemmas = Object.fromEntries(Object.entries(spans).map(([k, [a, bb]]) => [k, !errs.some((L) => a <= L && L <= bb)]));
  const main = `Equal_${snake(unit)}`;
  const canonParts = Object.keys(lemmas).filter((k) => k.startsWith(`EqualCanon_${snake(unit)}_`)); // the canonical-heap certificate: every part must hold (equal up to a renaming of fresh cells and up to dropped allocations)
  const canon = canonParts.length ? { parts: Object.fromEntries(canonParts.map((k) => [k, lemmas[k]])), proved: canonParts.every((k) => lemmas[k]) } : null;
  if (m && canon && canon.proved && !lemmas[main]) lemmas[main] = true; // the unit is proved by the canonical reading; lanes.A.reading says which
  const unguarded = (fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').match(new RegExp(`^// UNGUARDED ${main}: (.*)$`, 'm')) || [])[1] ?? null; // the identity guard withheld the lemma: the value reading could not be shown to be a graph reading
  cert.lanes.A = { verdict: unguarded ? (unguarded.startsWith('interface') ? 'ASK:interface' : 'ASK:identity') : m ? (lemmas[main] ? 'PASS-proved' : 'ASK:unproved') : (v.timedOut ? 'ASK:timeout' : 'ASK:translation-defect'), identity: unguarded, lemmas, reading: m && lemmas[main] ? (canon && canon.proved && !(spans[main] && !errs.some((L) => spans[main][0] <= L && L <= spans[main][1])) ? 'canonical heap: equal up to a renaming of fresh cells and up to dropped allocations' : 'whole heap') : null, canonical: canon, heapCore: heapOf('candidate').split(',').filter(Boolean), dafny: (text.match(/Dafny program verifier finished[^\n]*/) || [''])[0], theoremSha256: sha(path.join(tmp, 'theorem.dfy')), preludeSha256: sha(path.join(tmp, 'candidate.pre.dfy')), dafnyVersion: run('dafny', ['--version'], 20000).out.trim(), timeLimitSeconds: dafnySeconds, dir: tmp };
  const cellsLine = cand.match(new RegExp(`^// CELLS ${snake(unit)}_candidate: (.*)$`, 'm')); // the state-completeness audit: every persistent cell the unit touches, each matched to its transition
  if (cellsLine) { try { cert.lanes.A.cells = JSON.parse(cellsLine[1]); } catch { cert.lanes.A.cells = null; } }
  if (cert.lanes.A.cells && cert.lanes.A.cells.obligations.length && m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:obligation'; return finish('ASK', cert, { reason: `obligation: ${cert.lanes.A.cells.obligations.join('; ')}` }); } // a cell the unit touches without a transition: the lemma proves nothing about it
  const lib = b.bound?.library; // lane B's record of the unit's built-in calls against the library table: a defect is a wrong row, and the proof read that row
  if (lib && lib.defects.length) { cert.lanes.A.libraryDefects = lib.defects; if (m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:library-model'; return finish('ASK', cert, { reason: `library-model: the engine contradicts the table on ${lib.defects.map((x) => `${x.op} (${x.why}; expected ${x.expected})`).join('; ')}; the proof lane refuses the operation until the row is corrected` }); } }
  const decoUsed = [...new Set(['parent', 'candidate'].flatMap((x) => { const p = path.join(tmp, `${x}.dfy`); return fs.existsSync(p) ? [...fs.readFileSync(p, 'utf8').matchAll(/^\/\/ DECORATORS \S+: (.*)$/gm)].flatMap((mm) => mm[1].split(',')) : []; }))].sort(); // the decorator-table rows the readings used (translate/decorators.json): each is trusted for its framework version only
  if (decoUsed.length) cert.lanes.A.decorators = decoUsed.map((id) => ({ id, version: rowById(id)?.version ?? null, fixture: rowStatus(id) }));
  const decoDefects = decoUsed.filter(rowContradicted); // a row the real framework contradicts (its fixture disagrees) is a defect of the table, and the proof read that row
  if (decoDefects.length && m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:decorator-model'; return finish('ASK', cert, { reason: `decorator-model: the framework contradicts the decorator table on ${decoDefects.join('; ')}; the proof lane withholds the reading until the row is corrected` }); }
  const hd = b.bound?.frontEnd?.handlers; // lane B's interpreter applied each readable handler descriptor at every fire: a defect is a descriptor the engine contradicts, and the proof read that descriptor
  if (hd && typeof hd === 'object' && hd.defects?.length) { cert.lanes.A.handlerDefects = hd.defects; if (m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:handler-model'; return finish('ASK', cert, { reason: `handler-model: the engine contradicts the descriptor on ${[...new Set(hd.defects.map((x) => x.handler))].join('; ')}; the proof lane refuses the reading until it is corrected` }); } }
  if (unguarded && unguarded.startsWith('interface')) return finish('ASK', cert, { reason: `interface: ${unguarded.replace(/^interface differs: /, '').slice(0, 300)}` }); // a changed decorator, a changed type: never a proof, and the bounded run drew its inputs from one side's types
  if (m && lemmas[main] && !unguarded) return finish('PASS-proved', cert, {});
  return finish((b.verdict === 'PASS-bounded' || b.verdict === 'PASS-decided') ? bounded : 'ASK', cert, {});
}
function finish(verdict, cert, extra) { return { verdict, ...extra, certificate: cert }; }
// a run that ends without a verdict, or a harness error that escapes a lane: ASK:harness, the phase named
const harnessAsk = (reason, opts) => finish('ASK', { tool: 'lean-ts v3', unit: opts.unit, parent: { file: opts.parent, sha256: sha(opts.parent) }, candidate: { file: opts.candidate, sha256: sha(opts.candidate) }, lanes: { B: { verdict: 'ASK:harness', reason } } }, { reason });

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const files = { parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit') };
  const guard = verdictGuard(opt('--out', null), (r) => harnessAsk(r.reason, files));
  const res = await check({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), project: a.includes('--no-project') ? false : opt('--project', true), dafnySeconds: Number(opt('--dafny-seconds', 60)), scope: opt('--scope', null), deep: a.includes('--deep') }).catch((e) => harnessAsk(`harness: ${crumbText()}: ${String(e && e.message || e).slice(0, 300)}`, files));
  guard.settle();
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) { fs.writeFileSync(out, text); console.log(`${res.verdict} -> ${out}`); } else console.log(text);
  if (out && res.verdict === 'WITNESS' && Array.isArray(res.witness?.patch)) { console.log(`patch: ${res.witness.patchSummary}`); for (const op of res.witness.patch) console.log(`  ${formatOp(op)}`); } // a front-end WITNESS: the patch from the parent's tree to the candidate's, one op per line, path first (the JSON form carries it in witness.patch)
}
