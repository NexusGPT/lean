// The doubles driver of lane A (design/doubles.md): one unit, parent against candidate, read as SMT-LIB QF_FP
// (translate/smt-fp.mjs), solved by Z3, a counterexample replayed in Node through lane B's runner.
//
//   solveUnit({ parent, candidate, unit, seconds = 60, project = false })
//     -> { bearing: null }                           the unit performs no number operation: this reading has nothing to say
//     -> { bearing, verdict, ... }                   verdict one of
//          'proved'    unsat: the results are the same value (SameValue) for every input
//          'witness'   sat, decoded and replayed in Node: the two sides differ there (input, both observations)
//          'unknown'   the solver's unknown or timeout, an encoding the emitter refuses (reason), or a sat model the
//                      replay does not confirm while an operation is read uninterpreted (that function's model is free)
//          'finding'   a sat model the replay does not confirm with every operation exact: the ENCODING is wrong,
//                      named, never a witness
//   The record names the solver, its version and executable (solve/z3.mjs: the Z3 Dafny is given), the seconds, the
//   operations encoded exactly and those read uninterpreted.
//
// A second solver cross-checks when LEAN_FP_CROSS names one on PATH (`bitwuzla` or `cvc5`; neither is installed here):
// a disagreement between a proof and a model is a 'finding'. The query file is kept beside the record (`query`).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProgram, topLevelFunctions } from '../common.mjs';
import { numberBearing, encodeUnit, equivalenceQuery } from '../translate/smt-fp.mjs';
import { z3Binary } from './z3.mjs';

export const FP_SECONDS = 60;
// an SMT-LIB FloatingPoint value as a solver prints it, back to a double
export function fpValue(text) {
  const t = text.trim();
  const special = t.match(/^\(_ (NaN|\+zero|-zero|\+oo|-oo) 11 53\)$/);
  if (special) return { NaN: NaN, '+zero': 0, '-zero': -0, '+oo': Infinity, '-oo': -Infinity }[special[1]];
  const m = t.match(/^\(fp (#[bx][0-9a-fA-F]+) (#[bx][0-9a-fA-F]+) (#[bx][0-9a-fA-F]+)\)$/);
  if (!m) throw new Error(`not a binary64 value: ${t}`);
  const bin = (s, w) => (s[1] === 'b' ? s.slice(2) : BigInt('0x' + s.slice(2)).toString(2)).padStart(w, '0');
  const bits = bin(m[1], 1) + bin(m[2], 11) + bin(m[3], 52);
  if (bits.length !== 64) throw new Error(`not 64 bits: ${t}`);
  const b = new DataView(new ArrayBuffer(8)); b.setBigUint64(0, BigInt('0b' + bits)); return b.getFloat64(0); // the bit vector into a Float64Array's bytes
}
const strValue = (t) => { const m = t.match(/^"((?:[^"]|"")*)"$/s); if (!m) throw new Error(`not a string value: ${t}`); return m[1].replace(/""/g, '"').replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, a, b) => String.fromCodePoint(parseInt(a ?? b, 16))); };
// the value of each parameter in a get-value answer
export function modelValues(out, params) {
  const res = {};
  for (const { name, sort } of params) {
    const esc = name.replace(/[|.$\[\]()*+?^{}\\]/g, (c) => '\\' + c);
    const re = sort === 'String' ? `\\(${esc} ("(?:[^"]|"")*")\\)` : sort === 'Bool' ? `\\(${esc} (true|false)\\)` : `\\(${esc} (\\(fp [^)]*\\)|\\(_ [^)]*\\))\\)`;
    const m = out.match(new RegExp(re, 's'));
    if (!m) throw new Error(`no model value for ${name}`);
    res[name] = sort === 'String' ? strValue(m[1]) : sort === 'Bool' ? m[1] === 'true' : fpValue(m[1]);
  }
  return res;
}
const versionOf = (bin) => { const r = spawnSync(bin, ['--version'], { encoding: 'utf8' }); return r.status === 0 ? (r.stdout + r.stderr).trim().split('\n')[0] : null; };
// one solver run on a query file: unsat | sat | unknown (a timeout is unknown), the seconds and the whole output; `kind`
// picks the arguments, `bin` the executable (Z3 is the one solve/z3.mjs names, the cross solver its name on PATH)
export function runSolver(bin, file, seconds, kind = bin) {
  const args = kind === 'z3' ? [`-T:${seconds}`, file] : bin === 'cvc5' ? [`--tlimit=${seconds * 1000}`, '--produce-models', file] : [`--time-limit=${seconds * 1000}`, '--produce-models', file];
  const t0 = process.hrtime.bigint();
  const r = spawnSync(bin, args, { encoding: 'utf8', timeout: (seconds + 15) * 1000, maxBuffer: 1 << 26 });
  const secs = Number(process.hrtime.bigint() - t0) / 1e9;
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const first = out.trim().split('\n')[0] ?? '';
  const answer = r.error?.code === 'ETIMEDOUT' || first === 'timeout' ? 'unknown' : /^(unsat|sat|unknown)$/.test(first) ? first : 'error';
  return { answer, seconds: secs, out };
}

// replay the decoded input on both sides with lane B's runner (exec/run.mjs: the sandbox, the unit, one observation each)
export async function replay({ parent, candidate, unit, project, args }) {
  const { inputPlan, sandbox, pickUnit, observe, findRoot } = await import('../exec/run.mjs');
  const { Environment, renderDrawn } = await import('../exec/fake.mjs');
  const plan = inputPlan(parent, candidate, unit, { project, seed: 1, values: null });
  const side = async (file) => {
    const env = new Environment(7919); env.shapes = plan.spec;
    const u = pickUnit(sandbox(env, findRoot(file)).load(file), plan.spec, env);
    if (!u) throw new Error(`unit ${unit} not found in ${file}`);
    await new Promise((r) => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    return observe({ env, unit: u }, plan.spec, args.slice(), 2000);
  };
  const p = await side(parent), c = await side(candidate);
  return { args: renderDrawn(args), parent: p, candidate: c, differs: JSON.stringify(p) !== JSON.stringify(c) };
}

// the arguments of the call from a model: a scalar parameter its value, a record parameter the object its read leaves
// make (a field the unit never reads is absent: neither side reads it)
function argsOf(v, q) {
  return q.params.map((p) => {
    if (p.sort !== 'Obj') return v[p.name];
    const o = {};
    for (const x of q.vars.filter((y) => y.path && y.path.startsWith(`${p.name}.`))) { const ks = x.path.split('.').slice(1); let at = o; ks.slice(0, -1).forEach((k) => { at = at[k] ??= {}; }); at[ks[ks.length - 1]] = v[x.name]; }
    return o;
  });
}
const programOf = (file, project) => loadProgram(file, { project });
export async function solveUnit({ parent, candidate, unit, seconds = FP_SECONDS, project = false, keep = null }) {
  let P, C;
  try { P = programOf(parent, project); C = programOf(candidate, project); } catch (e) { return { bearing: { kind: 'unread', text: String(e.message).slice(0, 120) }, verdict: 'unknown', reason: `the program did not load: ${String(e.message).slice(0, 160)}` }; }
  const bearing = numberBearing(C.checker, C.sf, unit) ?? numberBearing(P.checker, P.sf, unit);
  if (!bearing) return { bearing: null };
  const ep = encodeUnit(P.checker, P.sf, unit, 'parent'), ec = encodeUnit(C.checker, C.sf, unit, 'candidate');
  const q = equivalenceQuery(ep, ec);
  const z3 = z3Binary(); // the Z3 Dafny verifies with and the certificate's tools name (solve/z3.mjs)
  const base = { bearing, solver: 'z3', solverVersion: z3.version, solverPath: z3.path, timeoutSeconds: seconds, encoded: q.encoded ?? [...new Set([...(ep.encoded ?? []), ...(ec.encoded ?? [])])].sort(), uninterpreted: q.uninterpreted ?? [...new Set([...(ep.uninterpreted ?? []), ...(ec.uninterpreted ?? [])])].sort() };
  if (!q.ok) return { ...base, verdict: 'unknown', reason: `not encoded: ${q.reason}`, seconds: 0 };
  if (!z3.path) return { ...base, verdict: 'unknown', reason: `no Z3: ${z3.source}`, seconds: 0 };
  const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'lean-fp-'));
  const file = path.join(dir, `fp-${unit.replace(/\W/g, '_')}.smt2`); fs.writeFileSync(file, q.text);
  const r = runSolver(z3.path, file, seconds, 'z3');
  const rec = { ...base, query: file, seconds: Number(r.seconds.toFixed(3)), answer: r.answer };
  const cross = process.env.LEAN_FP_CROSS;
  if (cross) {
    const v = versionOf(cross);
    if (!v) rec.cross = { solver: cross, answer: null, why: `${cross} is not on PATH` };
    else { const x = runSolver(cross, file, seconds); rec.cross = { solver: cross, version: v, answer: x.answer, seconds: Number(x.seconds.toFixed(3)) }; if ((x.answer === 'sat' && r.answer === 'unsat') || (x.answer === 'unsat' && r.answer === 'sat')) return { ...rec, verdict: 'finding', reason: `the solvers disagree: z3 ${r.answer}, ${cross} ${x.answer}` }; }
  }
  if (r.answer === 'unsat') return { ...rec, verdict: 'proved' };
  if (r.answer !== 'sat') return { ...rec, verdict: 'unknown', reason: r.answer === 'error' ? `solver error: ${r.out.trim().slice(0, 200)}` : `the solver answered ${r.answer} within ${seconds} s` };
  let args;
  try { args = argsOf(modelValues(r.out, q.vars), q); } catch (e) { return { ...rec, verdict: 'finding', reason: `the model did not decode: ${e.message}` }; }
  let rp;
  try { rp = await replay({ parent, candidate, unit, project, args }); } catch (e) { return { ...rec, verdict: 'unknown', reason: `the replay did not run: ${String(e.message).slice(0, 160)}`, input: args }; }
  if (rp.differs) return { ...rec, verdict: 'witness', input: rp.args, parentObservation: rp.parent, candidateObservation: rp.candidate };
  if (base.uninterpreted.length) return { ...rec, verdict: 'unknown', reason: `the model differs only through ${base.uninterpreted.join(', ')} read uninterpreted; the replay agrees`, input: rp.args };
  return { ...rec, verdict: 'finding', reason: 'ENCODING FINDING: the solver found a difference the replay in Node does not show, with every operation encoded exactly', input: rp.args };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const res = await solveUnit({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), seconds: Number(opt('--seconds', FP_SECONDS)), project: a.includes('--project') ? opt('--project') : false });
  console.log(JSON.stringify(res, null, 1));
}
