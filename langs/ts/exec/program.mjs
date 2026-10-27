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
