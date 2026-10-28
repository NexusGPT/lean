// Node's side of the conformance step: lane B's own input plan (run.mjs inputPlan: the enumerated small heaps, then the
// seeded draws), input i drawn on a fresh environment seeded as lane B seeds it, the side's file loaded in lane B's
// sandbox with its fakes, and the unit observed by lane B's observe. Nothing here reads a value its own way: the
// outcome is lane B's rendering. A third copy of input i, drawn the same way and never run, is what the model reads.
import { inputPlan, sandbox, pickUnit, observe, findRoot, sideLocations } from '../exec/run.mjs';
import { Environment, renderDrawn, render, setRoots } from '../exec/fake.mjs';
import { expandRefs } from './bridge.mjs';

// run.mjs installs late-error hooks that end the process when no lane B run is in flight; here every unit call is ours,
// so an error that escapes a unit is that input's late error, recorded, never the end of the step
process.removeAllListeners('unhandledRejection'); process.removeAllListeners('uncaughtException');
let late = [];
process.on('unhandledRejection', (e) => { late.push(String(e && e.message || e).slice(0, 200)); });
process.on('uncaughtException', (e) => { late.push(String(e && e.message || e).slice(0, 200)); });

export function planOf(parent, candidate, unit, seed = 1) {
  const plan = inputPlan(parent, candidate, unit, { project: false, seed, values: null });
  setRoots(sideLocations(parent, candidate, { parent: findRoot(parent), candidate: findRoot(candidate) }));
  return plan;
}

// a fresh copy of input i, never run: what the model is handed
export function drawCopy(plan, i, seed = 1) {
  const env = new Environment(seed * 7919 + i); env.shapes = plan.spec;
  return plan.draw(i, env);
}

// one side on input i: the observation lane B makes (outcome, trace, pending), the args as drawn and after the call
export async function nodeRun(plan, file, i, { seed = 1, ms = 2000 } = {}) {
  const env = new Environment(seed * 7919 + i); env.shapes = plan.spec;
  let u;
  try { u = pickUnit(sandbox(env, findRoot(file)).load(file), plan.spec, env); } catch (e) { return { harness: `load: ${String(e && e.message).slice(0, 160)}` }; }
  if (!u) return { harness: 'unit not found' };
  await new Promise((r) => setImmediate(r));
  env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // as run.mjs mountSides: what the module did while loading is not the unit's
  const inputs = plan.draw(i, env);
  env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
  const drawn = renderDrawn(inputs);
  late = [];
  const obs = await observe({ env, unit: u }, plan.spec, inputs, ms);
  if (obs.harness || obs.impure) return { harness: obs.harness ?? 'render-impure', drawn };
  return { drawn, outcome: obs.outcome, after: expandRefs(renderDrawn(inputs)), trace: obs.trace.map((r) => render(r)), pending: obs.pending.length, late: late.slice(), receiver: obs.receiver };
}

