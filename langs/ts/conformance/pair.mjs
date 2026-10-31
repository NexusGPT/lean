#!/usr/bin/env node
// One pair through the conformance step (design/model-conformance.md):
//   node pair.mjs <pair dir> <work dir> [--n 30] [--seed 1]
// The parent and the candidate are translated as the suite translates them (tests/run.mjs: --core --suffix --heap,
// check.mjs agreeCore), each model is compiled to JavaScript (model.mjs), and every input lane B draws for a unit of the
// pair's scope (run.mjs inputPlan, seed 1, the suite's n) is run through Node in lane B's sandbox and through both
// models. Per input and side: agree, disagree (the model's result is not Node's under SameValue), not executable (the
// run reached a part with no body), outside the model's domain, not bridged. Then the product check: on an input where
// a model reached a part with no body, both models run with one shared table for those parts under three seeds; two
// models that agree under every seed while Node's two results differ are a coupling finding. Writes <work>/result.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agreeCore, dafnyName } from '../check.mjs';
import { ts, topLevelFunctions } from '../common.mjs';
import { compileSide, compiledSide, loadSide, OpaqueHit, opaqueValue, canon } from './model.mjs';
import { makeBridge, NoBridge, OutOfDomain, Opaque, show } from './bridge.mjs';
import { domainOf } from './dafny-text.mjs';
import { heapBridge } from './heap.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const translate = path.join(here, '../translate/translate.mjs');
const root = path.resolve(here, '../../..');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const pairDir = path.resolve(a[0]), work = path.resolve(a[1]);
const N = Number(opt('--n', 30)), SEED = Number(opt('--seed', 1)), SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
// --unit: one unit, in a process of its own, on the translation and models the pair's process made (a unit whose run
// spins in microtasks holds its process: the pair's process kills it at the bound, as lane B's worker is killed)
const ONLY = opt('--unit', null), UNIT_SECONDS = Number(opt('--unit-seconds', 120)); // lane B's own bound per unit (run.mjs UNIT_SECONDS)
const name = path.basename(pairDir);
fs.mkdirSync(work, { recursive: true });
// timing (seconds): the pair's own phases and each unit's wall and CPU, read by run.mjs into the cost table (row d7e54baf:
// the step's cost per pair was never measured)
const result = { pair: name, units: [], notes: [], timing: {} };
const secs = (t0) => Math.round((performance.now() - t0) / 10) / 100;
const cpuSecs = () => { const c = process.cpuUsage(); return Math.round((c.user + c.system) / 1e4) / 100; }; // this process alone, worker threads included
const write = () => { if (!opt('--unit', null)) fs.writeFileSync(path.join(work, 'result.json'), JSON.stringify(result, null, 1)); }; // a unit's process writes only its unit file
const pairFile = (side) => (fs.existsSync(path.join(pairDir, side + '.tsx')) ? path.join(pairDir, side + '.tsx') : path.join(pairDir, side + '.ts'));
const exp = JSON.parse(fs.readFileSync(path.join(pairDir, 'expect.json'), 'utf8'));
if (exp.candidateOnly || exp.laneBOnly) { result.skipped = exp.candidateOnly ? 'candidate-only units: no parent model' : 'lane A refuses this pair by design (laneBOnly)'; write(); process.exit(0); }

// ----- the translation, exactly as the suite's pair step -----
const tr = (which, extra) => spawnSync('node', [translate, pairFile(which), '--core', '--suffix', which, '--out', path.join(work, `${which}.dfy`), '--prelude', path.join(work, `${which}.pre.dfy`), '--no-project', ...(exp.heap !== false ? ['--heap'] : []), ...extra], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const tTranslate = performance.now();
const agreed = ONLY ? {} : agreeCore({ files: { parent: pairFile('parent'), candidate: pairFile('candidate') }, dfyOf: (w) => path.join(work, `${w}.dfy`), heap: exp.heap !== false, tr: (w, eff, units) => tr(w, [...(eff ? ['--effectful', eff] : []), ...(units !== undefined ? ['--heap-units', units || '-'] : [])]) });
if (!ONLY) result.timing.translateS = secs(tTranslate);
if (agreed.failed) { result.skipped = `lane A translation refused (${agreed.failed}): ${(agreed.run.stderr || agreed.run.stdout || '').trim().split('\n')[0].slice(0, 200)}`; write(); process.exit(0); }

// the units of the scope both files hold, by their TypeScript names
const tsUnits = (f) => [...topLevelFunctions(ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true)).keys()];
const pu = new Set(tsUnits(pairFile('parent'))), cu = tsUnits(pairFile('candidate'));
const units = cu.filter((u) => pu.has(u) && exp.scope.includes(dafnyName(u)));
for (const s of exp.scope) if (!units.some((u) => dafnyName(u) === s)) result.notes.push(`${s}: in the scope, not a unit both files hold`);

// ----- the two models -----
const models = {};
for (const side of ['parent', 'candidate']) {
  const tCompile = performance.now();
  const c = (ONLY && compiledSide({ dir: path.join(work, 'js'), label: side })) || compileSide({ dfy: path.join(work, `${side}.dfy`), prelude: path.join(work, `${side}.pre.dfy`), units: units.map((u) => `${dafnyName(u)}_${side}`), dir: path.join(work, 'js'), label: side });
  if (!ONLY) result.timing[`compile_${side}S`] = secs(tCompile);
  if (!c.ok) { result.skipped = `the ${side} model does not compile: ${c.error}`; write(); process.exit(0); }
  const m = loadSide(c); m.bridge = makeBridge(m); m.heap = heapBridge(m); models[side] = m;
}

// ----- one model run -----
const FUEL = 1000;
const mutatedNames = (text, fname) => { // the parameters a unit rebinds and returns after its result (translate.mjs mutLets: `var x := x;`)
  const lines = text.split('\n'); let i = lines.findIndex((l) => new RegExp(`^function ${fname}[<(]`).test(l)); if (i < 0) return [];
  while (i < lines.length && lines[i].trim() !== '{') i++;
  const out = []; for (let j = i + 1; j < lines.length && /^\s+var /.test(lines[j]); j++) { const m = lines[j].match(/^\s+var ([A-Za-z_][A-Za-z0-9_]*) := \1;$/); if (m) out.push(m[1]); }
  return out;
};
// prepare a unit's call on a model: the arguments from the drawn input, the domain predicate, the shape of the result
function prepare(m, fname, live, side) {
  const sig = m.signature(fname); if (!sig) throw new NoBridge('no model function');
  if (sig.tparams.length) throw new NoBridge('a generic unit (type parameters)');
  const tsSig = sigOf(m, fname);
  if (/^(Async)?(Generator|Iterator|IterableIterator|Iterable)\b/.test(tsSig?.ret ?? '')) throw new NoBridge('a generator result: lane B renders the iterator object, not what it yields');
  if (/_constructor_(parent|candidate)$/.test(fname)) throw new NoBridge('a constructor: its result is the instance lane B builds on a receiver of fakes');
  const args = []; let k = 0, world = null, hw = null;
  for (const p of sig.params) {
    const t = m.bridge.resolve(p.type);
    if (t.k === 'name' && t.name === 'World') { world = m.bridge.into ? makeWorld(m) : null; args.push(world); continue; }
    if (t.k === 'name' && t.name === 'HWorld') { hw = { index: args.length }; args.push(null); continue; }
    if (p.name === 'self' || p.name === 'this_') { if (t.k === 'name' && m.decls.opaque.has(t.name)) { args.push(opaqueValue(`receiver ${fname.replace(/_(parent|candidate)$/, '')}`)); continue; } throw new NoBridge('a class receiver the heap reads (lane B gives a receiver of fakes)'); } // an opaque receiver is a term: the model reads it only through bodiless accessors
    if (p.name === 'fuel' && t.k === 'name' && t.name === 'nat') { args.push(new (m.heap.BigNumber)(FUEL)); continue; }
    if (p.name === 'slots') throw new NoBridge('callback slots');
    if (k >= live.length) { if (t.k === 'name' && (t.name === 'Option' || t.name === 'Nullish')) { args.push(m.bridge.into(undefined, p.type)); k++; continue; } throw new NoBridge('more model parameters than arguments'); }
    if (hw) { args.push({ heapArg: k, type: p.type, name: p.name }); k++; continue; }
    m.bridge.state.none = absenceIn(tsSig?.params?.[k]?.type); args.push(m.bridge.into(live[k], p.type)); k++;
  }
  if (k < live.length && live.slice(k).some((x) => x !== undefined)) throw new NoBridge('fewer model parameters than arguments');
  if (hw) m.heap.fill(args, hw.index, live, fname); // the heap world: every object the heap-typed arguments reach, allocated by shape
  const d = domainOf(m.text, fname);
  return { sig, args, world, hw, domain: d, mutated: mutatedNames(m.text, fname) };
}
function makeWorld(m) { const W = m.M.World; const none = m.M.Option.create_None(); return W.create_World(opaqueValue('history:start'), none); }

// the model's answer split as the signature returns it: (World?, result, mutated..., slots?) or (HWorld, result, ...)
function parts(prep, out) {
  const ret = prep.sig.ret;
  const items = ret.k === 'tuple' && (prep.world || prep.hw || prep.mutated.length) ? ret.items : [ret];
  const vals = items.length === 1 ? [out] : [...out];
  let i = 0; const p = {};
  if (prep.world) { p.world = vals[i]; i++; }
  if (prep.hw) { p.hw = vals[i]; i++; }
  p.result = vals[i]; p.resultType = items[i]; i++;
  p.mutated = prep.mutated.map((nm, j) => ({ name: nm, value: vals[i + j], type: items[i + j] }));
  return p;
}

function unary(m, fname, live, node, paramNames) {
  let prep;
  try { prep = prepare(m, fname, live); } catch (e) { if (e instanceof NoBridge) return { status: 'not bridged', why: e.why }; if (e instanceof OutOfDomain) return { status: 'outside the model domain', why: e.why }; return { status: 'model error', why: `input: ${String(e.message).slice(0, 160)}` }; }
  m.state.handler = null; // unary: the first part with no body stops the run
  try {
    const dom = m.fn(`LeanDomain_${fname}`);
    if (dom && !dom(...prep.args)) return { status: 'outside the model domain', why: 'the unit\'s stated hypothesis (requires, HYP) is false on this input' };
  } catch (e) { if (e instanceof OpaqueHit) return { status: 'not executable', why: `domain predicate reaches ${e.symbol}`, symbol: e.symbol }; return { status: 'model error', why: `domain: ${String(e.message).slice(0, 160)}` }; }
  let out;
  try { out = m.fn(fname)(...prep.args); } catch (e) { if (e instanceof OpaqueHit) return { status: 'not executable', why: `reaches ${e.symbol}, a part with no body`, symbol: e.symbol }; return { status: 'model error', why: String(e && e.message).slice(0, 160), ...(process.env.LEAN_CONFORMANCE_DEBUG ? { stack: String(e.stack).split('\n').slice(0, 6).join(' | ') } : {}) }; }
  try { return compare(m, prep, parts(prep, out), node, paramNames); } catch (e) { return { status: 'model error', why: `compare: ${String(e && e.message).slice(0, 160)}`, ...(process.env.LEAN_CONFORMANCE_DEBUG ? { stack: String(e.stack).split('\n').slice(0, 6).join(' | ') } : {}) }; }
}

// the absence a None of this unit stands for, from its TypeScript signature (translate.mjs writes `// SIG <fn>: {...}`)
const absenceIn = (tsType) => { if (typeof tsType !== 'string') return 'either'; const n = /\bnull\b/.test(tsType), u = /\bundefined\b|\bvoid\b/.test(tsType); return n && !u ? 'null' : u && !n ? 'undefined' : 'either'; };
const sigOf = (m, fname) => { try { return JSON.parse((m.text.match(new RegExp(`^// SIG ${fname}: (.+)$`, 'm')) ?? [])[1] ?? 'null'); } catch { return null; } };
// the model's answer against Node's observation of the same input
function compare(m, prep, p, node, paramNames) {
  const tsSig = sigOf(m, prep.sig.name);
  if (prep.hw && p.hw && m.heap.oob(p.hw) && prep.domain.inrange) return { status: 'outside the model domain', why: 'an access out of range set the oob flag (INRANGE: not modelled from there)' };
  const faulted = p.world && m.M.World && p.world.fault && p.world.fault.$tag === 1;
  const o = node.outcome; const nodeThrew = Object.hasOwn(o, 'threw');
  if (faulted || nodeThrew) {
    if (faulted && nodeThrew) return { status: 'agree', note: 'both threw (the thrown value is opaque to the model)' };
    if (nodeThrew) return { status: 'disagree', cause: 'Node throws, the model returns', diff: `Node threw ${show(o.threw)}; the model returned ${safeCanon(p.result)}` };
    return { status: 'disagree', cause: 'the model faults, Node returns', diff: `the model's world holds a fault; Node returned ${show(o.returned)}` };
  }
  try {
    m.bridge.state.none = absenceIn(tsSig?.ret);
    let d = prep.hw ? m.heap.agreeResult(p.hw, p.result, p.resultType, o.returned) : m.bridge.agree(p.result, p.resultType, o.returned);
    if (!d) for (const mu of p.mutated) { const k = paramNames.indexOf(mu.name); if (k < 0) { d = null; continue; } m.bridge.state.none = absenceIn(tsSig?.params?.[k]?.type); d = m.bridge.agree(mu.value, mu.type, node.after[k], `argument ${mu.name} after the call`); if (d) break; }
    if (!d && prep.hw) d = m.heap.agreeArgs(p.hw, prep.args, node.after);
    if (d) return { status: 'disagree', cause: causeOf(d, tsSig, node.drawn), diff: d };
  } catch (e) { if (e instanceof Opaque) return { status: 'not executable', why: `the result holds a part with no body: ${e.why}` }; return { status: 'model error', why: `compare: ${String(e.message).slice(0, 160)}` }; }
  const requests = (node.trace ?? []).filter((r) => r && r.op !== 'get');
  if (requests.length) return { status: 'disagree', cause: 'Node asks the outside, the model reaches no transition', diff: `Node made ${requests.length} request(s), first ${show(requests[0])}; the model none` };
  if (node.pending) return { status: 'disagree', cause: 'Node leaves pending work, the model none', diff: `${node.pending} pending` };
  return { status: 'agree' };
}
const safeCanon = (x) => { try { return canon(x).slice(0, 120); } catch { return '?'; } };
// a disagreement's cause: the kind of value that differs, read off the difference itself
function causeOf(d, tsSig, drawn) {
  if (/"\$ref":\d+\}/.test(JSON.stringify(drawn ?? null))) return 'aliased arguments: one object at two places of the input';
  if (/\$negativeZero/.test(d)) return 'signed zero: Node -0, the model 0';
  if (/\$bigint/.test(d) || [...d.matchAll(/-?\d{16,}/g)].some((m) => (BigInt(m[0]) < 0n ? -BigInt(m[0]) : BigInt(m[0])) > 2n ** 53n)) return 'an integer past 2^53: the model is exact, Node rounds to binary64';
  if (tsSig?.params?.some((p) => p.rest)) return 'a rest parameter: lane B passes the drawn array as one argument';
  if (/model -?\d+\/\d+ \(/.test(d)) return 'real arithmetic: the model is exact, Node rounds to binary64';
  if (/model -?\d+ against -?\d+(\.\d+)?(e[+-]?\d+)?$/.test(d)) return 'integer value';
  if (/model "[^"]*" against "/.test(d)) return 'string value';
  if (/rest|undeclared key|no key|has the key/.test(d)) return 'record keys';
  if (/model None|model undefined|model null|\$undefined/.test(d)) return 'absence (undefined, null, missing)';
  if (/sequence of/.test(d)) return 'sequence length';
  return 'value';
}

// the product: both models with one table for the parts with no body, under a seed
function product(fnames, lives, seed) {
  const table = new Map(); let draws = 0;
  const outs = {}; const used = new Set(); const applied = { parent: [], candidate: [] };
  for (const side of ['parent', 'candidate']) {
    const m = models[side];
    let prep; try { prep = prepare(m, fnames[side], lives[side]); } catch { return null; }
    m.state.handler = (sym, args, ret) => {
      const key = `${sym}|${args.map(canon).join(',')}`; used.add(sym); applied[side].push(key);
      if (table.has(key)) return table.get(key);
      const sig = ret ? { ret } : m.sigOfExtern(sym); const v = sig ? gen(m, sig.ret, `${key}#${seed}`, () => draws++) : opaqueValue(key);
      table.set(key, v); return v;
    };
    try { outs[side] = canon(m.fn(fnames[side])(...prep.args)); } catch (e) { m.state.handler = null; return { error: String(e.message).slice(0, 120) }; }
    m.state.handler = null;
  }
  // coupled: the same applications on both sides (the same symbols on the same arguments, in the same order)
  if (process.env.LEAN_CONFORMANCE_DEBUG) console.error(JSON.stringify({ seed, outs, applied }).slice(0, 600));
  return { same: outs.parent === outs.candidate, shared: JSON.stringify(applied.parent) === JSON.stringify(applied.candidate), symbols: [...used].sort() };
}
// the constants the two models hold (string and integer literals of their own text): the values a drawn answer takes
// besides a few small ones, so a comparison of a bodiless part's answer against a constant can go either way
const POOL = (() => { const strings = new Set(), ints = new Set(); for (const m of Object.values(models)) { const main = m.text.split('// END PRELUDE').at(-1); for (const x of main.matchAll(/"((?:[^"\\]|\\.){0,40})"/g)) strings.add(x[1]); for (const x of main.matchAll(/(?<![\w.])-?\d{1,3}(?![\w.])/g)) ints.add(Number(x[0])); } return { strings: [...strings].slice(0, 40), ints: [...ints].slice(0, 40) }; })();
// a value of a declared type, drawn from a seed: the product's answer for a part with no body (opaque types are terms:
// the symbol and its arguments, the free reading of an uninterpreted function)
function gen(m, t0, key, tick) {
  let h = 0; for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const rnd = (k) => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return (h >>> 16) % k; }; // 32-bit arithmetic: a double product drops the low bits
  const B = m.heap.BigNumber, D = m.D;
  const g = (t0, depth) => {
    const t = m.bridge.resolve(t0);
    if (t.k === 'tuple') return D.Tuple.of(...t.items.map((x) => g(x, depth + 1)));
    if (t.k !== 'name') return opaqueValue(key);
    switch (t.name) {
      case 'int': case 'BigInt': { const xs = [-1, 0, 1, 2, ...POOL.ints]; return new B(xs[rnd(xs.length)]); } case 'nat': { const xs = [0, 1, 2, ...POOL.ints.filter((x) => x >= 0)]; return new B(xs[rnd(xs.length)]); }
      case 'real': return new D.BigRational(new B(rnd(7) - 3), new B(rnd(3) + 1));
      case 'bool': return rnd(2) === 1; case 'string': { const xs = ['', `o${rnd(5)}`, ...POOL.strings]; return D.Seq.UnicodeFromString(xs[rnd(xs.length)]); }
      case 'seq': return depth > 2 || rnd(2) ? D.Seq.of() : D.Seq.of(g(t.args[0], depth + 1));
      case 'set': return D.Set.fromElements(); case 'map': return D.Map.Empty;
    }
    if (t.name === 'World') { const W = m.M.World; return W.create_World(opaqueValue(`history:${key}`), m.M.Option.create_None()); }
    if (t.name === 'HWorld' || t.name === 'Obj') return opaqueValue(key); // a heap from a part with no body: a term, never a drawn heap
    const d = m.decls.datatypes.get(t.name);
    if (!d || depth > 3) return opaqueValue(key);
    const i = depth > 2 ? d.ctors.findIndex((c) => !c.fields.length) >= 0 ? d.ctors.findIndex((c) => !c.fields.length) : 0 : rnd(d.ctors.length); // every constructor drawn; past depth 2 a nullary one ends the value
    const C = m.M[t.name.replace(/_/g, '__')]; const mk = Object.getOwnPropertyNames(C).filter((k) => k.startsWith('create_'))[i];
    const env = {}; d.tparams.forEach((p, j) => { env[p] = t.args[j]; });
    return C[mk](...d.ctors[i].fields.map((f) => g(substitute(f.type, env), depth + 1)));
  };
  tick(); return g(t0, 0);
}
const substitute = (t, env) => (t.k === 'name' && env[t.name] && !t.args.length ? env[t.name] : t.k === 'name' ? { ...t, args: t.args.map((x) => substitute(x, env)) } : t.k === 'tuple' ? { ...t, items: t.items.map((x) => substitute(x, env)) } : t);

// ----- the units -----
if (!ONLY) { // the pair's process: each unit in its own process under the bound
  for (const unit of units) {
    const out = path.join(work, `unit-${dafnyName(unit)}.json`); fs.rmSync(out, { force: true });
    const tUnit = performance.now();
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), pairDir, work, '--n', String(N), '--seed', String(SEED), '--unit', unit], { encoding: 'utf8', timeout: UNIT_SECONDS * 1000, killSignal: 'SIGKILL', maxBuffer: 1 << 26 });
    let rec = null; try { rec = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* none: below */ }
    if (!rec) rec = { unit, dafny: dafnyName(unit), inputs: 0, sides: { parent: {}, candidate: {} }, disagreements: [], coupling: [], product: { inputs: 0, coupled: 0, agreedAllSeeds: 0 }, skipped: r.signal ? `Node did not answer: the unit's process passed its bound of ${UNIT_SECONDS} s (a run that spins, as lane B's spin-bound)` : `the unit's process ended without a result (exit ${r.status}): ${((r.stderr ?? '') + (r.stdout ?? '')).trim().split('\n').slice(-1)[0]?.slice(0, 200)}` };
    rec.wallS = secs(tUnit); // the unit's process from spawn to exit, its bound included when killed
    result.units.push(rec); write();
  }
  result.timing.pairProcessCpuS = cpuSecs(); // the pair's own process: translation driver, model loads; children are in run.mjs's CPU
  write(); process.exit(0);
}
const { planOf, drawCopy, nodeRun } = await import('./node-side.mjs');
for (const unit of units.filter((u) => u === ONLY)) {
  const fn = { parent: `${dafnyName(unit)}_parent`, candidate: `${dafnyName(unit)}_candidate` };
  const rec = { unit, dafny: dafnyName(unit), laneA: exp.equal?.[dafnyName(unit)] ?? null, inputs: 0, sides: { parent: {}, candidate: {} }, disagreements: [], coupling: [], product: { inputs: 0, coupled: 0, agreedAllSeeds: 0 } };
  result.units.push(rec);
  let plan; try { plan = planOf(pairFile('parent'), pairFile('candidate'), unit, SEED); } catch (e) { rec.skipped = `lane B has no input plan: ${String(e.message).slice(0, 160)}`; rec.cpuS = cpuSecs(); fs.writeFileSync(path.join(work, `unit-${dafnyName(unit)}.json`), JSON.stringify(rec, null, 1)); continue; }
  const paramNames = plan.spec.params?.map((p) => p.name) ?? [];
  for (let i = 0; i < N; i++) {
    const live = { parent: drawCopy(plan, i, SEED), candidate: drawCopy(plan, i, SEED) };
    const node = { parent: await nodeRun(plan, pairFile('parent'), i, { seed: SEED }), candidate: await nodeRun(plan, pairFile('candidate'), i, { seed: SEED }) };
    rec.inputs++;
    const opaqueSides = [];
    for (const side of ['parent', 'candidate']) {
      const n = node[side];
      let r;
      if (n.harness) r = { status: 'Node did not answer', why: n.harness };
      else r = unary(models[side], fn[side], live[side], n, paramNames);
      const tally = rec.sides[side];
      const key = r.status + (r.why ? `: ${r.why.replace(/[0-9]+/g, 'N').slice(0, 90)}` : '');
      tally[key] = (tally[key] ?? 0) + 1;
      if (r.stack) (rec.errors ??= []).push({ side, input: i, why: r.why, stack: r.stack });
      if (r.status === 'disagree') rec.disagreements.push({ side, input: i, args: node[side].drawn, node: node[side].outcome, cause: r.cause, diff: r.diff });
      if (r.status === 'not executable' && r.symbol) opaqueSides.push(side);
    }
    // the product check: an input where a model reached a part with no body
    if (opaqueSides.length && !node.parent.harness && !node.candidate.harness) {
      const sameNode = JSON.stringify([node.parent.outcome, node.parent.after, node.parent.trace]) === JSON.stringify([node.candidate.outcome, node.candidate.after, node.candidate.trace]);
      rec.product.inputs++;
      const runs = SEEDS.map((s) => product(fn, live, s));
      if (runs.every((x) => x && !x.error && x.same && x.shared)) {
        rec.product.agreedAllSeeds++;
        if (!sameNode) { rec.product.coupled++; rec.coupling.push({ input: i, args: node.parent.drawn, symbols: runs[0].symbols, node: { parent: node.parent.outcome, candidate: node.candidate.outcome }, why: `both models agree under ${SEEDS.length} seeds of the shared symbols ${runs[0].symbols.join(', ')}; Node's results differ` }); }
      }
    }
  }
  rec.unseen = models.parent.bridge.state.unseen + models.candidate.bridge.state.unseen; // positions of Node's result rendered as a second sight: not compared
  rec.cpuS = cpuSecs(); // the unit's process: lane B's sandbox runs and the two models, in this process
  fs.writeFileSync(path.join(work, `unit-${dafnyName(unit)}.json`), JSON.stringify(rec, null, 1));
}
process.exit(0); // a unit's late timers or pending work never hold its process
