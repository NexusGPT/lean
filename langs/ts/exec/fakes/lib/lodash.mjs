// lodash as a library fake: the package's own code (vendor/lodash, 4.18.1), one instance per side made by lodash's
// `runInContext` from that side's globals (design/w2d-library-rows.md). Every pure function is lodash's; what lodash
// takes from its context is the side's world:
//   - setTimeout / clearTimeout: the virtual clock (env.arm, env.clearTimer), so `debounce` and `throttle` arm timers
//     the run fires in due order and a cleared one leaves nothing, as every timer the unit arms;
//   - Date.now, read by debounce and throttle to measure the wait: the virtual clock's own instant (CLOCK_EPOCH plus
//     env.timers.now), the instant the timers fire at, so a wait measured by lodash is the wait the queue keeps;
//   - Math.random (random, shuffle, sample, sampleSize): the side's seeded generator, the one the unit's Math.random reads;
//   - Array, Object, String, RegExp, Error, TypeError, Function, Symbol, Map, Set, WeakMap, Promise: the side's globals.
// `_.now()` called by the unit is the unit's clock read (the recorded, seeded Date.now), as `Date.now()` is.
import vm from 'node:vm';
import { vendoredText, manifestOf } from './load.mjs';
import { CLOCK_EPOCH } from '../../record.mjs';

let base = null; // the host's lodash, loaded once: only its runInContext is used
function hostLodash() {
  if (base) return base;
  const m = manifestOf('lodash');
  const mod = { exports: {} };
  vm.compileFunction(vendoredText('lodash', m.main), ['exports', 'module'], { filename: 'lean-vendor:lodash/lodash.js' })(mod.exports, mod);
  return (base = mod.exports);
}
const GLOBALS = ['Array', 'Object', 'String', 'RegExp', 'Error', 'TypeError', 'Function', 'Math', 'Symbol', 'Map', 'Set', 'WeakMap', 'Promise', 'setTimeout', 'clearTimeout', 'Date'];
export function lodashFor(env) {
  if (env.lodashInstance) return env.lodashInstance;
  const g = vm.runInContext(`({ ${GLOBALS.join(', ')} })`, env.ctx);
  const context = { ...g, Date: { now: () => CLOCK_EPOCH + env.timers.now } };
  const _ = hostLodash().runInContext(context);
  _.now = () => g.Date.now(); // the unit's own clock read
  return (env.lodashInstance = _);
}
export const lodashVersion = () => manifestOf('lodash')?.version ?? null;
