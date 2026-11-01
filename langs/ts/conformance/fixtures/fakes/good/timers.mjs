// A minimal timers fake (fixture until w2b's exec/fakes/timers.mjs lands): every timer armed on lane B's virtual clock
// (Environment.arm), so exec/run.mjs runTimers fires it; Node's delay coercion (below 1, not a number, past 2^31-1:
// 1 ms) applied first. `order` builds the wrong variant (../wrong): every timer fires in arm order, its delay ignored.
export const specifier = 'node:timers';
const coerce = (ms) => { const d = Number(ms); return !(d >= 1 && d <= 2147483647) ? 1 : Math.trunc(d); };
// runTimers takes a firing timer off the queue before its callback and re-arms an interval after it, so a clearInterval
// inside the interval's own callback finds nothing to clear; the fake keeps the ids it cleared and a cleared timer's
// callback does not run (reported to the clock's owners: the re-armed entry still fires, with no callback)
export function makeTimers(env, { armOrder = false } = {}) {
  const cleared = new Set();
  const arm = (kind) => function (fn, ms, ...args) { env.record('call', `module:timers.set${kind[0].toUpperCase()}${kind.slice(1)}`, [kind === 'immediate' ? 0 : coerce(ms)]); let id; const run = (...a) => (cleared.has(id) ? undefined : fn(...a)); id = env.arm(kind, run, armOrder ? 1 : kind === 'immediate' ? 0 : coerce(ms), args); return id; };
  const clear = (name) => function (id) { env.record('call', `module:timers.${name}`, []); cleared.add(id); env.clearTimer(id, name); };
  return { setTimeout: arm('timeout'), setInterval: arm('interval'), setImmediate: arm('immediate'), clearTimeout: clear('clearTimeout'), clearInterval: clear('clearInterval'), clearImmediate: clear('clearImmediate') };
}
export const create = (env) => makeTimers(env);
