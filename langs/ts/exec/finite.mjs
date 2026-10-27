// The finite-state lane for components (rung 2 of the certificate): a component whose hook slots and props are all
// finite by their types is a machine with finitely many states; parent and candidate are explored together over every
// click order, from every prop assignment, with effects and timers inside each step. A divergence is a WITNESS with the
// shortest click sequence; a closed exploration with no divergence is PASS-decided, with the state pairs visited; a
// bound hit is ASK. Finiteness is read from the TypeScript types (useState type arguments or the widened initialiser,
// the first parameter's record type); a function or element prop is one opaque input.
import vm from 'node:vm';
import path from 'node:path';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { reactHook } from '../react.mjs';
import { Environment, render, BudgetError } from './fake.mjs';
import { interpretFire } from './handlers-interp.mjs';
// the runtime helpers (sandbox, pickUnit, commitRender, commitEffects, treeHandlers, runTimers, RenderLoop) come from
// run.mjs through the `rt` argument: run.mjs imports this file, so a static import back would be a cycle

const TF = ts.TypeFlags;
// the values of a finite type, or null
function finiteValues(checker, t, depth = 0) {
  if (!t || depth > 3) return null;
  if (t.flags & (TF.Any | TF.Unknown)) return null;
  if (t.flags & TF.BooleanLike) return [true, false];
  if (t.flags & TF.BooleanLiteral) return [t.intrinsicName === 'true'];
  if (t.flags & (TF.StringLiteral | TF.NumberLiteral)) return [t.value];
  if (t.flags & TF.Null) return [null];
  if (t.flags & (TF.Undefined | TF.Void)) return [undefined];
  if (t.flags & TF.EnumLiteral) return [t.value];
  if (t.flags & TF.Union) { const out = []; for (const p of t.types) { const v = finiteValues(checker, p, depth + 1); if (!v) return null; for (const x of v) if (!out.some((y) => Object.is(y, x))) out.push(x); } return out; }
  if (t.flags & TF.Enum) { const out = []; for (const m of checker.getPropertiesOfType(t)) { const mt = checker.getTypeOfSymbol ? checker.getTypeOfSymbol(m) : null; const v = mt && finiteValues(checker, mt, depth + 1); if (!v) return null; out.push(...v); } return out.length ? out : null; }
  return null;
}
const isOpaqueProp = (checker, t) => { if (t.flags & TF.Object) { if (checker.getSignaturesOfType(t, ts.SignatureKind.Call).length) return 'function'; const nm = (t.aliasSymbol ?? t.symbol)?.name ?? ''; if (['ReactNode', 'ReactElement', 'Element', 'JSX.Element', 'ReactPortal'].includes(nm)) return 'node'; } if (t.flags & TF.Union) { const parts = t.types.map((p) => isOpaqueProp(checker, p) || (finiteValues(checker, p) ? 'finite' : null)); if (parts.every(Boolean) && parts.some((p) => p === 'function' || p === 'node')) return 'mixed'; } return null; };

// the finite domain of a component: its slot types and its prop assignments, or null with the reason
export function finiteDomain(file, unit, { project = false, maxAssignments = 64 } = {}) {
  const { checker, sf } = loadProgram(file, { project });
  const u = topLevelFunctions(sf).get(unit); if (!u || !u.body || !ts.isBlock(u.body)) return { why: 'unit has no block body' };
  const slots = [];
  for (const st of u.body.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
    const init = d.initializer; if (!(init && ts.isCallExpression(init) && reactHook(checker, init) === 'useState')) continue;
    let t = checker.getTypeArguments(checker.getTypeAtLocation(init))[0];
    if (!t || (t.flags & (TF.Any | TF.Unknown))) t = init.typeArguments?.[0] ? checker.getTypeFromTypeNode(init.typeArguments[0]) : init.arguments[0] ? checker.getBaseTypeOfLiteralType(checker.getTypeAtLocation(init.arguments[0])) : null;
    const values = finiteValues(checker, t); if (!values) return { why: `state slot ${slots.length} is not finite (${t ? checker.typeToString(t) : 'untyped'})` };
    slots.push({ index: slots.length, values });
  }
  if (!slots.length) return { why: 'no useState slot' };
  const props = [];
  const p0 = u.params[0];
  if (p0) {
    const pt = checker.getTypeAtLocation(p0.name);
    if (!(pt.flags & TF.Object)) return { why: `props type is not a record (${checker.typeToString(pt)})` };
    for (const prop of checker.getPropertiesOfType(pt)) {
      const t = checker.getTypeOfSymbol ? checker.getTypeOfSymbol(prop) : checker.getTypeOfSymbolAtLocation(prop, p0);
      const opaque = isOpaqueProp(checker, t);
      if (opaque) { props.push({ name: prop.name, opaque }); continue; }
      const values = finiteValues(checker, t); if (!values) return { why: `prop ${prop.name} is not finite (${checker.typeToString(t)})` };
      props.push({ name: prop.name, values: (prop.flags & ts.SymbolFlags.Optional) && !values.some((v) => v === undefined) ? [...values, undefined] : values });
    }
  }
  let assignments = [{}];
  for (const p of props) { if (p.opaque) continue; const next = []; for (const a of assignments) for (const v of p.values) next.push({ ...a, [p.name]: v }); assignments = next; if (assignments.length > maxAssignments) return { why: `more than ${maxAssignments} prop assignments` }; }
  return { slots, props, assignments, hasProps: !!p0 };
}

// a unit call under the context's watchdog (as run.mjs does): an endless click handler is a timeout, never a hang
class CallTimeout extends Error { constructor() { super('__timeout__'); } }
// the watchdog call and the await of a unit promise come from the runtime (run.mjs): they open the recording window of the library table
const erase = (v) => (Array.isArray(v) ? v.map(erase) : v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el') ? { $el: v.$el, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, typeof x === 'function' ? 'fn' : erase(x)])), children: v.children.map(erase) } : v);

// explore the product of parent and candidate over every click order from every prop assignment
export async function exploreFinite({ files, roots, spec, unit, domain, seed = 1, ms = 2000, maxPairs = 500, rt, handlers = null }) {
  const { sandbox, pickUnit, commitRender, commitEffects, treeHandlers, runTimers, RenderLoop } = rt;
  let pairs = 0, pathsRun = 0;
  for (const [ai, assignment] of domain.assignments.entries()) {
    const mount = async (name) => {
      const env = new Environment(seed * 7919 + ai); env.shapes = spec;
      const exportsObj = sandbox(env, roots[name]).load(files[name]); const u = pickUnit(exportsObj, spec, env); if (!u) throw new Error(`${name}: unit ${unit} not exported`);
      await new Promise((r) => setImmediate(r)); env.trace.length = 0; env.pending.length = 0; env.calls.clear();
      // the props: the finite assignment, with one fake per opaque prop (the same fake path on both sides)
      const props = { ...assignment }; for (const p of domain.props) if (p.opaque) props[p.name] = env.fake(`props.${p.name}`);
      const inputs = domain.hasProps ? [props] : [];
      return { env, u, inputs };
    };
    const guarded = rt.guardedCall, awaitUnit = rt.awaitUnit;
    const call = (s) => () => guarded(s.env, () => s.u.call(s.inputs), ms);
    const commit = async (s) => { let v = await commitEffects(s.env, call(s), ms, await commitRender(s.env, call(s), ms)); if (s.env.timers.queue.length) { await runTimers(s.env, ms); v = await commitEffects(s.env, call(s), ms, await commitRender(s.env, call(s), ms)); } return v; };
    const stateKey = (s) => JSON.stringify([render(s.env.hookSlots ?? []), render(s.env.pending.map(({ id, ...rest }) => rest))]);
    const runPath = async (name, labels) => { // a fresh mount, the clicks replayed: branches never share a mutated state
      const s = await mount(name); let tree = await commit(s); const obs = [];
      for (const label of labels) {
        const h = treeHandlers(tree).find((x) => x.label === label); if (!h) return { obs, missing: label, s, tree };
        const from = s.env.trace.length;
        const event = s.env.fake(`react:event:${label}`), slotsBefore = (s.env.hookSlots ?? []).slice(); let threw = false;
        try { const r = guarded(s.env, () => h.fn(event), ms); if (r && typeof r.then === 'function') await awaitUnit(s.env, r, ms); } catch (e) { if (e instanceof BudgetError || e instanceof CallTimeout) throw e; threw = true; s.env.record('handler-throw', label, [render(e)]); }
        if (handlers) interpretFire(handlers.stats, handlers.models[name], { fn: h.fn, label, args: [event], env: s.env, slotsBefore, props: s.inputs[0], threw }); // the descriptor applied to the slots before the handler must give the slots the handler left
        tree = await commit(s);
        obs.push({ command: label, tree: erase(tree), trace: s.env.trace.slice(from).filter((x) => x.op !== 'set' && x.op !== 'hook').map((x) => render(x)), pending: render(s.env.pending.map(({ id, ...rest }) => rest)) }); // setter calls are state, compared through the slots; their order inside one handler is React's batching, not an observation
      }
      return { obs, s, tree, handlers: treeHandlers(tree).map((x) => x.label) };
    };
    const seen = new Set(); let frontier = [[]];
    while (frontier.length) {
      const next = [];
      for (const labels of frontier) {
        let P, C;
        try { P = await runPath('parent', labels); C = await runPath('candidate', labels); pathsRun += 2; } catch (e) { if (e instanceof BudgetError || e instanceof CallTimeout || e instanceof RenderLoop) return { verdict: 'ASK', reason: `clicks ${JSON.stringify(labels)}: ${e.message}`, pairs, assignments: ai + 1 }; throw e; }
        if (P.missing || C.missing) return { verdict: 'WITNESS', witness: { props: assignment, clicks: labels, reason: `handler ${P.missing ?? C.missing} present on one side only` }, pairs };
        const k = P.obs.length === 0 ? `${stateKey(P.s)}|${stateKey(C.s)}` : null;
        for (let i = 0; i < P.obs.length; i++) { const a = JSON.stringify(P.obs[i]), b = JSON.stringify(C.obs[i]); if (a !== b) return { verdict: 'WITNESS', witness: { props: assignment, clicks: labels, step: i, parent: P.obs[i], candidate: C.obs[i] }, pairs }; }
        const tp = JSON.stringify(erase(P.tree)), tc = JSON.stringify(erase(C.tree)); if (tp !== tc) return { verdict: 'WITNESS', witness: { props: assignment, clicks: labels, step: labels.length, parent: erase(P.tree), candidate: erase(C.tree) }, pairs };
        const key = k ?? `${stateKey(P.s)}|${stateKey(C.s)}`; if (seen.has(key)) continue; seen.add(key); pairs++;
        if (pairs > maxPairs) return { verdict: 'ASK', reason: `more than ${maxPairs} state pairs`, pairs };
        if (P.handlers.join() !== C.handlers.join()) return { verdict: 'WITNESS', witness: { props: assignment, clicks: labels, reason: 'different handler sets', parent: P.handlers, candidate: C.handlers }, pairs };
        for (const label of P.handlers) next.push([...labels, label]);
      }
      frontier = next;
    }
  }
  return { verdict: 'PASS-decided', pairs, assignments: domain.assignments.length, pathsRun, note: 'every click order from every prop assignment, at the element-tree layer, with effects and timers inside each step; a function or element prop is one opaque input' };
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2); const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const { specOf } = await import('./spec.mjs'); const rt = await import('./run.mjs');
  const parent = path.resolve(opt('--parent')), candidate = path.resolve(opt('--candidate')), unit = opt('--unit');
  const domain = finiteDomain(candidate, unit);
  if (domain.why) { console.log(JSON.stringify({ verdict: 'not finite', why: domain.why })); process.exit(0); }
  const spec = specOf(candidate, unit, { project: false });
  const res = await exploreFinite({ files: { parent, candidate }, roots: { parent: path.dirname(parent), candidate: path.dirname(candidate) }, spec, unit, domain, ms: Number(opt('--ms', 2000)), maxPairs: Number(opt('--max', 500)), rt });
  console.log(JSON.stringify({ ...res, domain: { slots: domain.slots.map((s) => s.values.length), props: domain.props.map((p) => p.name + (p.opaque ? ':' + p.opaque : ':' + p.values.length)) } }, null, 1));
}
