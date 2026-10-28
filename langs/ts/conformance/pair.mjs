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
import { compileSide, loadSide, OpaqueHit, opaqueValue, canon } from './model.mjs';
import { makeBridge, NoBridge, OutOfDomain, Opaque, show } from './bridge.mjs';
import { domainOf } from './dafny-text.mjs';
import { heapBridge } from './heap.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const translate = path.join(here, '../translate/translate.mjs');
const root = path.resolve(here, '../../..');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const pairDir = path.resolve(a[0]), work = path.resolve(a[1]);
const N = Number(opt('--n', 30)), SEED = Number(opt('--seed', 1)), SEEDS = [1, 2, 3];
const name = path.basename(pairDir);
fs.mkdirSync(work, { recursive: true });
const result = { pair: name, units: [], notes: [] };
const write = () => fs.writeFileSync(path.join(work, 'result.json'), JSON.stringify(result, null, 1));
const pairFile = (side) => (fs.existsSync(path.join(pairDir, side + '.tsx')) ? path.join(pairDir, side + '.tsx') : path.join(pairDir, side + '.ts'));
const exp = JSON.parse(fs.readFileSync(path.join(pairDir, 'expect.json'), 'utf8'));
if (exp.candidateOnly || exp.laneBOnly) { result.skipped = exp.candidateOnly ? 'candidate-only units: no parent model' : 'lane A refuses this pair by design (laneBOnly)'; write(); process.exit(0); }

// ----- the translation, exactly as the suite's pair step -----
const tr = (which, extra) => spawnSync('node', [translate, pairFile(which), '--core', '--suffix', which, '--out', path.join(work, `${which}.dfy`), '--prelude', path.join(work, `${which}.pre.dfy`), '--no-project', ...(exp.heap !== false ? ['--heap'] : []), ...extra], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const agreed = agreeCore({ files: { parent: pairFile('parent'), candidate: pairFile('candidate') }, dfyOf: (w) => path.join(work, `${w}.dfy`), heap: exp.heap !== false, tr: (w, eff, units) => tr(w, [...(eff ? ['--effectful', eff] : []), ...(units !== undefined ? ['--heap-units', units || '-'] : [])]) });
if (agreed.failed) { result.skipped = `lane A translation refused (${agreed.failed}): ${(agreed.run.stderr || agreed.run.stdout || '').trim().split('\n')[0].slice(0, 200)}`; write(); process.exit(0); }

// the units of the scope both files hold, by their TypeScript names
const tsUnits = (f) => [...topLevelFunctions(ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true)).keys()];
const pu = new Set(tsUnits(pairFile('parent'))), cu = tsUnits(pairFile('candidate'));
const units = cu.filter((u) => pu.has(u) && exp.scope.includes(dafnyName(u)));
for (const s of exp.scope) if (!units.some((u) => dafnyName(u) === s)) result.notes.push(`${s}: in the scope, not a unit both files hold`);

// ----- the two models -----
const models = {};
for (const side of ['parent', 'candidate']) {
  const c = compileSide({ dfy: path.join(work, `${side}.dfy`), prelude: path.join(work, `${side}.pre.dfy`), units: units.map((u) => `${dafnyName(u)}_${side}`), dir: path.join(work, 'js'), label: side });
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
  const args = []; let k = 0, world = null, hw = null;
  for (const p of sig.params) {
    const t = m.bridge.resolve(p.type);
    if (t.k === 'name' && t.name === 'World') { world = m.bridge.into ? makeWorld(m) : null; args.push(world); continue; }
    if (t.k === 'name' && t.name === 'HWorld') { hw = { index: args.length }; args.push(null); continue; }
    if (p.name === 'self' || p.name === 'this_') throw new NoBridge('a class receiver (lane B gives a receiver of fakes)');
    if (p.name === 'fuel' && t.k === 'name' && t.name === 'nat') { args.push(new (m.heap.BigNumber)(FUEL)); continue; }
    if (p.name === 'slots') throw new NoBridge('callback slots');
    if (k >= live.length) { if (t.k === 'name' && (t.name === 'Option' || t.name === 'Nullish')) { args.push(m.bridge.into(undefined, p.type)); k++; continue; } throw new NoBridge('more model parameters than arguments'); }
    if (hw) { args.push({ heapArg: k, type: p.type, name: p.name }); k++; continue; }
    args.push(m.bridge.into(live[k], p.type)); k++;
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
  try { out = m.fn(fname)(...prep.args); } catch (e) { if (e instanceof OpaqueHit) return { status: 'not executable', why: `reaches ${e.symbol}, a part with no body`, symbol: e.symbol }; return { status: 'model error', why: String(e && e.message).slice(0, 160) }; }
  return compare(m, prep, parts(prep, out), node, paramNames);
}

// the model's answer against Node's observation of the same input
function compare(m, prep, p, node, paramNames) {
  if (prep.hw && p.hw && m.heap.oob(p.hw) && prep.domain.inrange) return { status: 'outside the model domain', why: 'an access out of range set the oob flag (INRANGE: not modelled from there)' };
  const faulted = p.world && m.M.World && p.world.fault && p.world.fault.$tag === 1;
  const o = node.outcome; const nodeThrew = Object.hasOwn(o, 'threw');
  if (faulted || nodeThrew) {
    if (faulted && nodeThrew) return { status: 'agree', note: 'both threw (the thrown value is opaque to the model)' };
    if (nodeThrew) return { status: 'disagree', cause: 'Node throws, the model returns', diff: `Node threw ${show(o.threw)}; the model returned ${safeCanon(p.result)}` };
    return { status: 'disagree', cause: 'the model faults, Node returns', diff: `the model's world holds a fault; Node returned ${show(o.returned)}` };
  }
  try {
    let d = prep.hw ? m.heap.agreeResult(p.hw, p.result, p.resultType, o.returned) : m.bridge.agree(p.result, p.resultType, o.returned);
    if (!d) for (const mu of p.mutated) { const k = paramNames.indexOf(mu.name); if (k < 0) { d = null; continue; } d = m.bridge.agree(mu.value, mu.type, node.after[k], `argument ${mu.name} after the call`); if (d) break; }
    if (!d && prep.hw) d = m.heap.agreeArgs(p.hw, prep.args, node.after);
    if (d) return { status: 'disagree', cause: causeOf(d), diff: d };
  } catch (e) { if (e instanceof Opaque) return { status: 'not executable', why: `the result holds a part with no body: ${e.why}` }; return { status: 'model error', why: `compare: ${String(e.message).slice(0, 160)}` }; }
  const requests = (node.trace ?? []).filter((r) => r && r.op !== 'get');
  if (requests.length) return { status: 'disagree', cause: 'Node asks the outside, the model reaches no transition', diff: `Node made ${requests.length} request(s), first ${show(requests[0])}; the model none` };
  if (node.pending) return { status: 'disagree', cause: 'Node leaves pending work, the model none', diff: `${node.pending} pending` };
  return { status: 'agree' };
}
const safeCanon = (x) => { try { return canon(x).slice(0, 120); } catch { return '?'; } };
// a disagreement's cause: the kind of value that differs, read off the difference itself
function causeOf(d) {
  if (/against \{"\$negativeZero"/.test(d)) return 'signed zero: Node -0, the model 0';
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
    m.state.handler = (sym, args) => {
      const key = `${sym}|${args.map(canon).join(',')}`; used.add(sym); applied[side].push(key);
      if (table.has(key)) return table.get(key);
      const sig = m.sigOfExtern(sym); const v = sig ? gen(m, sig.ret, `${key}#${seed}`, () => draws++) : opaqueValue(key);
      table.set(key, v); return v;
    };
    try { outs[side] = canon(m.fn(fnames[side])(...prep.args)); } catch (e) { m.state.handler = null; return { error: String(e.message).slice(0, 120) }; }
    m.state.handler = null;
  }
  // coupled: the same applications on both sides (the same symbols on the same arguments, in the same order)
  return { same: outs.parent === outs.candidate, shared: JSON.stringify(applied.parent) === JSON.stringify(applied.candidate), symbols: [...used].sort() };
}
// a value of a declared type, drawn from a seed: the product's answer for a part with no body (opaque types are terms:
// the symbol and its arguments, the free reading of an uninterpreted function)
function gen(m, t0, key, tick) {
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = (k) => { h = (h * 1103515245 + 12345) >>> 0; return h % k; };
  const B = m.heap.BigNumber, D = m.D;
  const g = (t0, depth) => {
    const t = m.bridge.resolve(t0);
    if (t.k === 'tuple') return D.Tuple.of(...t.items.map((x) => g(x, depth + 1)));
    if (t.k !== 'name') return opaqueValue(key);
    switch (t.name) {
      case 'int': return new B(rnd(7) - 3); case 'nat': return new B(rnd(4));
      case 'real': return new D.BigRational(new B(rnd(7) - 3), new B(rnd(3) + 1));
      case 'bool': return rnd(2) === 1; case 'string': return D.Seq.UnicodeFromString(`o${rnd(5)}`);
      case 'seq': return depth > 2 || rnd(2) ? D.Seq.of() : D.Seq.of(g(t.args[0], depth + 1));
      case 'set': return D.Set.fromElements(); case 'map': return D.Map.Empty;
    }
    if (t.name === 'World') { const W = m.M.World; return W.create_World(opaqueValue(`history:${key}`), m.M.Option.create_None()); }
    if (t.name === 'HWorld' || t.name === 'Obj') return opaqueValue(key); // a heap from a part with no body: a term, never a drawn heap
    const d = m.decls.datatypes.get(t.name);
    if (!d || depth > 3) return opaqueValue(key);
    const i = t.name === 'Option' || t.name === 'More' ? 0 : rnd(d.ctors.length);
    const C = m.M[t.name.replace(/_/g, '__')]; const mk = Object.getOwnPropertyNames(C).filter((k) => k.startsWith('create_'))[i];
    const env = {}; d.tparams.forEach((p, j) => { env[p] = t.args[j]; });
    return C[mk](...d.ctors[i].fields.map((f) => g(substitute(f.type, env), depth + 1)));
  };
  tick(); return g(t0, 0);
}
const substitute = (t, env) => (t.k === 'name' && env[t.name] && !t.args.length ? env[t.name] : t.k === 'name' ? { ...t, args: t.args.map((x) => substitute(x, env)) } : t.k === 'tuple' ? { ...t, items: t.items.map((x) => substitute(x, env)) } : t);

// ----- the units -----
const { planOf, drawCopy, nodeRun } = await import('./node-side.mjs');
for (const unit of units) {
  const fn = { parent: `${dafnyName(unit)}_parent`, candidate: `${dafnyName(unit)}_candidate` };
  const rec = { unit, dafny: dafnyName(unit), inputs: 0, sides: { parent: {}, candidate: {} }, disagreements: [], coupling: [], product: { inputs: 0, coupled: 0, agreedAllSeeds: 0 } };
  result.units.push(rec);
  let plan; try { plan = planOf(pairFile('parent'), pairFile('candidate'), unit, SEED); } catch (e) { rec.skipped = `lane B has no input plan: ${String(e.message).slice(0, 160)}`; write(); continue; }
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
  write();
}
write();
