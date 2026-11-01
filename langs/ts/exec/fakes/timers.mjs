// `timers` and `timers/promises` on lane B's virtual clock (fake.mjs arm, run.mjs runTimers). The callback forms are
// the sandbox's own setTimeout and friends: armed with their due instant, fired after the call in due order, a cleared
// one leaves nothing. The promise forms elapse on the same clock: every timer awaited in a run is settled in due order
// (ties by arm order), one per turn of the event loop, the clock moved to its instant, and each firing recorded.
import { entries } from './common.mjs';

export function timersModel(env) {
  const calls = {
    setTimeout: ([fn, ms, ...a]) => env.arm('timeout', fn, ms, a), setInterval: ([fn, ms, ...a]) => env.arm('interval', fn, ms, a), setImmediate: ([fn, ...a]) => env.arm('immediate', fn, 0, a),
    clearTimeout: ([id]) => env.clearTimer(id, 'clearTimeout'), clearInterval: ([id]) => env.clearTimer(id, 'clearInterval'), clearImmediate: ([id]) => env.clearTimer(id, 'clearImmediate'),
  };
  return entries({ name: 'timers', calls, pure: Object.keys(calls), objects: ['promises'], dynamic: (m) => (m.startsWith('promises.') ? timersPromisesModel(env).entry(m.slice(9)) : null) });
}

// the awaited timers of one environment: settled in due order on host turns, so a race between two sleeps is won by
// the shorter, as on the event loop
function awaited(env) {
  if (env.awaitedTimers) return env.awaitedTimers;
  const q = []; let order = 0, scheduled = false;
  const turn = () => {
    scheduled = false;
    if (!q.length) return;
    q.sort((a, b) => a.due - b.due || a.order - b.order);
    const e = q.shift();
    if (e.due > env.timers.now) env.timers.now = e.due;
    env.record('fire', `timers/promises.${e.kind}`, [e.due]);
    e.resolve(e.value);
    if (q.length) { scheduled = true; setImmediate(turn); }
  };
  return (env.awaitedTimers = (kind, ms, value) => new Promise((resolve) => {
    q.push({ kind, due: env.timers.now + (kind === 'setImmediate' ? 0 : Math.max(0, Number(ms) || 0)), order: order++, value, resolve });
    if (!scheduled) { scheduled = true; setImmediate(turn); }
  }));
}
export function timersPromisesModel(env) {
  const calls = {
    setTimeout: ([ms, value]) => awaited(env)('setTimeout', ms, value),
    setImmediate: ([value]) => awaited(env)('setImmediate', 0, value),
    'scheduler.wait': ([ms]) => awaited(env)('setTimeout', ms, undefined),
    'scheduler.yield': () => awaited(env)('setImmediate', 0, undefined),
  };
  return entries({ name: 'timers/promises', calls, pure: Object.keys(calls), objects: ['scheduler'] });
}
