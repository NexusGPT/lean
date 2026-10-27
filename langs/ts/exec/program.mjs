// Lane B, environment programs with retained handles (research 15 §5 and §26, brief 15): a unit may hand the
// environment a function (a callback, a returned closure, a generator) that the environment keeps and calls later,
// repeatedly. One call observes one invocation; a PROGRAM observes the rest: call the unit, retain what it returned,
// invoke a retained function again, fire a callback the unit handed to a fake, tick the timers it armed, settle the
// jobs it queued, drive a generator. The program is drawn and shrunk by fast-check's model-based commands (vendored,
// langs/ts/vendor): a command is legal when the model says so (a retained function to invoke, a timer to tick), every
// command runs on both sides and compares the two observations, and the first failing program is shrunk to a minimal
// one. The certificate carries the program, the seed and the replay path, and the replay is run once more before the
// WITNESS is reported. A clean run states the program and command counts (bound.environmentPrograms); never a proof.
import { Environment, render, BudgetError } from './fake.mjs';
import { inputsFor } from './gen.mjs';
import { ts, loadProgram } from '../common.mjs';

const fcPromise = import('../vendor/fast-check/lib/fast-check.js');
const isGen = (v) => !!v && typeof v === 'object' && typeof v.next === 'function' && typeof v[Symbol.iterator] === 'function';
const retainable = (v) => typeof v === 'function' || isGen(v);
const drain = async () => { await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); }; // the shared event loop, twice: the continuations queued so far, and the ones they queue
class Divergence extends Error { constructor(step, parent, candidate) { super(`divergence at ${step}`); this.step = step; this.parent = parent; this.candidate = candidate; } }

export async function runEnvironmentPrograms({ files, roots, spec, seed, ms, rt, runs = 12, maxCommands = 6 }) {
  const fc = await fcPromise;
  const mount = (name) => { const env = new Environment(seed * 7919 + 777); env.shapes = spec; env.knownCallables = []; const exportsObj = rt.sandbox(env, roots[name]).load(files[name]); const u = rt.pickUnit(exportsObj, spec, env); if (!u) throw new Error(`${name}: unit ${spec.unit} not exported`); return { name, env, unit: u, retained: [] }; };
  // the two sides share one event loop: whatever a module started while loading (a `main().catch(...)` entry) settles
  // here, once for both, and is the starting state of both, never the observation of whichever side drains it first
  const startFrom = async (sides) => { await drain(); for (const s of sides) { s.env.trace.length = 0; s.env.pending.length = 0; s.env.calls.clear(); } };
  // one command on one side: the thrown or returned value, what was asked of the environment since the last command
  const step = async (s, fn) => {
    const mark = s.env.trace.length; let outcome;
    try { const thunk = fn(s); let v = rt.guardedCall(s.env, thunk, ms); if (v && typeof v.then === 'function') v = await rt.awaitUnit(s.env, v, ms); outcome = { returned: render(v) }; if (retainable(v)) { s.retained.push(v); outcome.retained = s.retained.length - 1; } }
    catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; outcome = { threw: render(e) }; }
    await new Promise((r) => setImmediate(r));
    return { outcome, trace: s.env.trace.slice(mark), pending: s.env.pending.length };
  };
  const both = async (real, label, fn) => { const p = await step(real.parent, (s) => fn(real.parent)), c = await step(real.candidate, (s) => fn(real.candidate)); if (JSON.stringify(p) !== JSON.stringify(c)) throw new Divergence(label, p, c); return [p, c]; };
  const sync = (m, real) => { m.retained = real.parent.retained.length; m.callables = real.parent.env.knownCallables.length; m.timers = real.parent.env.timers.queue.filter((e) => e.fired === 0).length; m.generators = real.parent.retained.map((v, i) => (isGen(v) ? i : -1)).filter((i) => i >= 0); m.functions = real.parent.retained.map((v, i) => (typeof v === 'function' ? i : -1)).filter((i) => i >= 0); };
  class Call { constructor(idx) { this.idx = idx; } check() { return true; } async run(m, real) { await both(real, `call(${this.idx})`, (s) => { const args = inputsFor(spec, seed, this.idx, s.env); return () => s.unit.call(args); }); sync(m, real); } toString() { return `call(${this.idx})`; } }
  class Invoke { constructor(i, idx) { this.i = i; this.idx = idx; } check(m) { return m.functions.length > 0; } async run(m, real) { const i = m.functions[this.i % m.functions.length]; await both(real, `invoke(${i}, ${this.idx})`, (s) => { const fn = s.retained[i]; const args = Array.from({ length: Math.min(fn.length, 3) }, (_, k) => s.env.fake(`invoke${this.idx}.arg${k}`)); return () => fn(...args); }); sync(m, real); } toString() { return `invoke(${this.i}, ${this.idx})`; } }
  class Fire { constructor(j, idx) { this.j = j; this.idx = idx; } check(m) { return m.callables > 0; } async run(m, real) { const j = this.j % m.callables; await both(real, `fire(${j}, ${this.idx})`, (s) => { const { fn, path } = s.env.knownCallables[j]; const args = Array.from({ length: Math.min(fn.length, 2) }, (_, k) => s.env.fake(`${path}#fire${this.idx}.arg${k}`)); return () => fn(...args); }); sync(m, real); } toString() { return `fire(${this.j}, ${this.idx})`; } }
  class Tick { check(m) { return m.timers > 0; } async run(m, real) { const outs = []; for (const s of [real.parent, real.candidate]) { const mark = s.env.trace.length; await rt.runTimers(s.env, ms); outs.push({ trace: s.env.trace.slice(mark), pending: s.env.pending.length }); } if (JSON.stringify(outs[0]) !== JSON.stringify(outs[1])) throw new Divergence('tick', outs[0], outs[1]); sync(m, real); } toString() { return 'tick'; } }
  class Settle { check() { return true; } async run(m, real) { const sides = [real.parent, real.candidate]; const marks = sides.map((s) => s.env.trace.length); await drain(); const outs = sides.map((s, k) => ({ trace: s.env.trace.slice(marks[k]), pending: s.env.pending.length })); if (JSON.stringify(outs[0]) !== JSON.stringify(outs[1])) throw new Divergence('settle', outs[0], outs[1]); sync(m, real); } toString() { return 'settle'; } } // one drain of the shared loop, both marks taken before it: a drain is never one side's window
  class Next { constructor(i, kind, v) { this.i = i; this.kind = kind; this.v = v; } check(m) { return m.generators.length > 0; } async run(m, real) { const i = m.generators[this.i % m.generators.length]; await both(real, `${this.kind}(${i}, ${this.v})`, (s) => { const g = s.retained[i]; return () => (this.kind === 'throw' ? g.throw(new Error(`thrown ${this.v}`)) : this.kind === 'return' ? g.return(this.v) : g.next(this.v)); }); sync(m, real); } toString() { return `${this.kind}(${this.i}, ${this.v})`; } }
  const arbs = [
    fc.nat({ max: 60 }).map((idx) => new Call(idx)),
    fc.tuple(fc.nat({ max: 7 }), fc.nat({ max: 60 })).map(([i, idx]) => new Invoke(i, idx)),
    fc.tuple(fc.nat({ max: 7 }), fc.nat({ max: 60 })).map(([j, idx]) => new Fire(j, idx)),
    fc.constant(null).map(() => new Tick()),
    fc.constant(null).map(() => new Settle()),
    fc.tuple(fc.nat({ max: 7 }), fc.constantFrom('next', 'throw', 'return'), fc.nat({ max: 9 })).map(([i, k, v]) => new Next(i, k, v)),
  ];
  const setup = async () => { const real = { parent: mount('parent'), candidate: mount('candidate') }; await startFrom([real.parent, real.candidate]); return { model: { retained: 0, callables: 0, timers: 0, generators: [], functions: [] }, real }; };
  const propertyWith = (replayPath) => fc.asyncProperty(fc.commands(arbs, replayPath ? { maxCommands, replayPath } : { maxCommands }), async (cmds) => { await fc.asyncModelRun(setup, cmds); });
  const property = propertyWith(null);
  let r;
  try { r = await fc.check(property, { seed, numRuns: runs }); }
  catch (e) { return { verdict: 'ASK', reason: `environment programs: ${String(e && e.message).slice(0, 160)}` }; }
  if (!r.failed) return { verdict: 'PASS-bounded', runs: r.numRuns, maxCommands, seed };
  const err = r.errorInstance ?? r.error;
  if (!(err instanceof Divergence)) return { verdict: 'ASK', reason: `environment programs: ${String(err && err.message ? err.message : err).slice(0, 160)}`, program: [...r.counterexample[0]].map(String), seed: r.seed, path: r.counterexamplePath };
  const program = [...r.counterexample[0]].map(String);
  const replayPath = (String(r.counterexample[0]).match(/replayPath="([^"]*)"/) || [])[1] ?? null; // the commands' own replay path (which drawn commands the model let run), beside the run path
  let replayed = false; // the shrunk program once more, by seed, path and replay path: the certificate's replay is a fact, not a promise
  try { const again = await fc.check(propertyWith(replayPath), { seed: r.seed, path: r.counterexamplePath, endOnFailure: true }); replayed = !!again.failed; } catch { replayed = false; }
  return { verdict: 'WITNESS', program, step: err.step, parent: err.parent, candidate: err.candidate, seed: r.seed, path: r.counterexamplePath, replayPath, replayed, runs: r.numRuns, maxCommands };
}

// ----- races: two callers, scheduled releases, an order set bounded by conflicts (design/schedules.md) -----
// The event model: the first call runs to its first suspension; the second call's ARRIVAL is a scheduled event, and so
// is the release of every promise the world answers (fake.mjs holds each one in fast-check's scheduler, vendored).
// Between two events the microtasks run to quiescence. An execution is the order of the events after the first call's
// start; it replays as the scheduler's own ordering (`fc.schedulerFor`). Two events are DEPENDENT when one writes a
// shared cell the other reads or writes (a field of the receiver; a field holding an object, once read, counts as
// written by that event and every later one, since a local may alias it; module state makes every pair dependent) or when both make requests of the world (the trace is ordered).
// From the first-in-first-out execution, an order is added only where it moves an event before a dependent one, and
// only while it takes at most `b` releases out of arm order; each side's orders give a SET of observations, and two
// sets that differ are a race the other version does not have.
export const RACE_BOUND = 'complete only within the stated bound and event model: two live calls of the unit, at most b releases taken out of arm order, the events being the first call\'s start, the second call\'s arrival and the release of each promise the world answers, microtasks run to quiescence between two events, timers never fire; never a claim about true parallelism or the outside\'s own ordering';
const parentOf = (label) => (label.includes('/') ? label.slice(0, label.lastIndexOf('/')) : '');
const harnessStop = (e) => e instanceof BudgetError || e?.message === '__timeout__';
// module state the receiver proxy cannot see: a top-level `let`/`var`, a top-level constant holding a container, a
// static field, an accessor or a value import of a sibling module; with any of them every pair of events is dependent
export function hiddenStateOf(file, project) {
  try {
    const { sf } = loadProgram(file, { project });
    for (const st of sf.statements) {
      if (ts.isVariableStatement(st)) { if (!(st.declarationList.flags & ts.NodeFlags.Const)) return 'a module variable'; for (const d of st.declarationList.declarations) { const i = d.initializer; if (i && !(ts.isLiteralExpression(i) || ts.isArrowFunction(i) || ts.isFunctionExpression(i) || ts.isNoSubstitutionTemplateLiteral(i) || i.kind === ts.SyntaxKind.TrueKeyword || i.kind === ts.SyntaxKind.FalseKeyword || ts.isPrefixUnaryExpression(i))) return 'a module constant holding a value that may be mutable'; } }
      if (ts.isImportDeclaration(st) && !st.importClause?.isTypeOnly && /^\./.test(st.moduleSpecifier.text) && st.importClause) return 'a value import of a sibling module';
      if (ts.isClassDeclaration(st)) for (const m of st.members) { if ((ts.isPropertyDeclaration(m) && m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) return 'a static field or an accessor'; if (m.name && ts.isPrivateIdentifier(m.name)) return 'private'; }
    }
    return null;
  } catch (e) { return `unread: ${String(e && e.message).slice(0, 80)}`; }
}
export async function exploreRaces({ mount, programs = 2, seed, ms, rt, b = 2, maxOrders = 48, maxSteps = 40, drawn = 3, hidden = null }) {
  const fc = await fcPromise;
  const dep = (x, y) => !!hidden || (x.world && y.world) || [...x.w].some((c) => y.r.has(c) || y.w.has(c)) || [...y.w].some((c) => x.r.has(c));
  const settle = async (env) => { await rt.awaitUnit(env, drain(), ms); };
  // one execution of program p on one side: `plan.prefix` forces the first releases (labels), then arm order; `plan.drawn`
  // lets a drawn fast-check scheduler choose every release
  const execute = async (name, p, plan) => {
    const s = await mount(name, p); const env = s.env; const taskIds = [];
    const sch = plan.drawn ?? fc.schedulerFor(taskIds); // a live ordering: each release is pushed before it is taken
    let cur = 'call1', step = null; const made = {}; const steps = [];
    const open = (label) => { step = { label, r: new Set(), w: new Set(), mark: env.trace.length, pend: env.pending.length }; };
    const close = (extra) => { for (const c of escaped) step.w.add(c); step.world = env.trace.length !== step.mark || env.pending.length !== step.pend; delete step.mark; delete step.pend; Object.assign(step, extra); steps.push(step); step = null; };
    const act = (label) => (f) => { cur = label; open(label); return f(); };
    env.scheduler = { hold: (v, path) => { v.catch(() => {}); made[cur] = (made[cur] ?? 0) + 1; const label = `${cur}/${made[cur]}`; return sch.schedule(v, label, { path }, act(label)); } };
    const escaped = new Set(); // an object a field held, once read: a later event may change it through a local alias, so every later event writes it
    env.access = (cell, kind) => { if (kind === 'object') escaped.add(cell); if (step) (kind === 'r' ? step.r : step.w).add(cell); };
    const outs = [null, null];
    const start = (c) => { let v; try { v = rt.guardedCall(env, s.start[c], ms); } catch (e) { if (harnessStop(e)) throw e; outs[c] = { threw: render(e) }; return; } if (v && typeof v.then === 'function') v.then((x) => { outs[c] = { returned: render(x) }; }, (e) => { outs[c] = { threw: render(e) }; }); else outs[c] = { returned: render(v) }; };
    open('call1'); start(0); await settle(env); close({});
    sch.schedule(Promise.resolve(), 'call2', { arrival: true }, act('call2')).then(() => start(1)); // the second caller arrives while the first is pending
    for (let n = 0; ; n++) {
      const pending = sch.report().filter((t) => t.status === 'pending');
      if (!pending.length) break;
      if (n >= maxSteps) throw new BudgetError(`more than ${maxSteps} scheduled releases in one execution`);
      const enabled = pending.map((t) => t.label), fifo = enabled[0];
      if (!plan.drawn) { const want = plan.prefix[n]; const pick = want === undefined ? pending[0] : pending.find((t) => t.label === want); if (!pick) return { infeasible: n }; taskIds.push(pick.taskId); }
      await rt.awaitUnit(env, (async () => { await sch.waitOne(); await drain(); })(), ms);
      close({ enabled, fifo });
    }
    const obs = { calls: outs.map((o) => o ?? { pending: true }), trace: env.trace, receiver: s.own ? render(s.own()) : null, pending: env.pending.map(({ id, ...rest }) => rest) };
    const releases = steps.slice(1);
    return { order: releases.map((x) => x.label), taskIds: sch.report().filter((t) => t.status !== 'pending').map((t) => t.taskId), steps: releases, obs, key: JSON.stringify(obs) };
  };
  const preempted = (ex, k) => ex.steps.slice(0, k).filter((x) => x.label !== x.fifo).length;
  // the order set of one side: from the arm-order execution, a new prefix moves an event (or the ancestor that armed it)
  // before an earlier dependent event; prefixes already run are not run again
  const side = async (name, p) => {
    const runs = [], tried = new Set(['']), stack = [[]], pairs = new Set(); let cut = 0, truncated = false, infeasible = 0;
    while (stack.length) {
      if (runs.length >= maxOrders) { truncated = true; break; }
      const prefix = stack.pop(); const ex = await execute(name, p, { prefix });
      if (ex.infeasible !== undefined) { infeasible++; continue; }
      runs.push(ex);
      const st = ex.steps;
      for (let j = 1; j < st.length; j++) for (let k = j - 1; k >= 0; k--) {
        if (!dep(st[k], st[j])) continue;
        let t = st[j].label; while (t && !st[k].enabled.includes(t)) t = parentOf(t);
        if (!t || t === st[k].label) continue;
        pairs.add(`${st[k].label} | ${st[j].label}`);
        const np = ex.order.slice(0, k).concat([t]); const key = np.join('|');
        if (tried.has(key)) continue; tried.add(key);
        if (preempted(ex, k) + (t !== st[k].fifo ? 1 : 0) > b) { cut++; continue; }
        stack.push(np);
      }
    }
    const set = new Map(); for (const r of runs) if (!set.has(r.key)) set.set(r.key, r);
    return { runs, set, pairs, cut, truncated, infeasible, complete: !truncated && cut === 0 && infeasible === 0 };
  };
  const draws = drawn > 0 ? fc.sample(fc.scheduler(), { seed, numRuns: drawn }) : [];
  const stats = { programs: 0, orders: { parent: 0, candidate: 0 }, drawn: 0, dependentPairs: 0, cut: { parent: 0, candidate: 0 }, complete: true };
  for (let p = 0; p < programs; p++) {
    const res = {};
    for (const name of ['parent', 'candidate']) {
      const S = await side(name, p);
      for (const d of draws) { // drawn orders beside the conflict-bounded set: on a complete side, an observation outside the set is a defect of the reduction
        const ex = await execute(name, p, { drawn: d[cloneMethodOf(fc)]() }); stats.drawn++;
        if (!S.set.has(ex.key)) { if (S.complete) return { verdict: 'ASK', reason: `races: a drawn order (${ex.order.join(', ')}) reached a ${name} observation the conflict-bounded order set did not; the dependency relation missed a conflict`, stats, undecided: true }; S.set.set(ex.key, ex); }
      }
      res[name] = S; stats.orders[name] += S.runs.length; stats.cut[name] += S.cut; stats.dependentPairs += S.pairs.size; if (!S.complete) stats.complete = false;
    }
    stats.programs++;
    const P = res.parent, C = res.candidate;
    const onlyC = [...C.set.values()].filter((r) => !P.set.has(r.key)), onlyP = [...P.set.values()].filter((r) => !C.set.has(r.key));
    if (!onlyC.length && !onlyP.length) continue;
    const [who, run, mine, other] = onlyC.length ? ['candidate', onlyC[0], C, P] : ['parent', onlyP[0], P, C];
    if (!other.complete) return { verdict: 'ASK', reason: `races: program ${p}: the ${who} reached an observation the ${who === 'candidate' ? 'parent' : 'candidate'} did not, but its order set was cut by the bound (${other.cut} prefixes over b = ${b}${other.truncated ? `, more than ${maxOrders} orders` : ''}), so the difference may lie outside it`, stats, undecided: true };
    const def = mine.runs[0];
    let i = 0; while (i < run.order.length && run.order[i] === def.order[i]) i++;
    const moved = run.order[i] ?? null, before = def.order[i] ?? null;
    const ms1 = run.steps[i], ms2 = run.steps.find((x) => x.label === before) ?? def.steps[i];
    const cells = ms1 && ms2 ? [...new Set([...ms1.w].filter((c) => ms2.r.has(c) || ms2.w.has(c)).concat([...ms2.w].filter((c) => ms1.r.has(c))))].concat(ms1.world && ms2.world ? ['the trace'] : []) : [];
    const again = await execute(who, p, { prefix: run.order }); // the distinguishing order once more, by its own ordering: the replay is a fact
    return { verdict: 'WITNESS', stats, witness: { program: p, side: who, orders: { default: { order: def.order, observation: def.obs, otherSideReaches: other.set.has(def.key) }, distinguishing: { order: run.order, taskIds: run.taskIds, observation: run.obs } }, dependentPair: { moved, before, cells: hidden ? [`every cell (${hidden})`] : cells }, otherSide: { orders: other.runs.length, observations: other.set.size, complete: other.complete }, replayed: again.key === run.key } };
  }
  return { verdict: 'PASS-bounded', stats };
}
const cloneMethodOf = (fc) => fc.cloneMethod;
// the races of a free function: two calls of it, each on its own copy of the p-th inputs, against one loaded module
export async function runFreeRaces({ files, roots, spec, seed, ms, rt, project }) {
  if (!spec.isAsync) return null;
  const hidden = hiddenStateOf(files.parent, project) ?? hiddenStateOf(files.candidate, project);
  const mount = async (name, p) => {
    const env = new Environment(seed * 7919 + 9001 + p); env.shapes = spec;
    const u = rt.pickUnit(rt.sandbox(env, roots[name]).load(files[name]), spec, env); if (!u) throw new Error(`${name}: unit ${spec.unit} not exported`);
    await drain(); env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // what the module did while loading is the starting state
    const args = [inputsFor(spec, seed, p, env), inputsFor(spec, seed, p, env)];
    return { env, start: [() => u.call(args[0]), () => u.call(args[1])], own: null };
  };
  return exploreRaces({ mount, seed, ms, rt, hidden });
}
