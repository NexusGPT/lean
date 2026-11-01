// A wrong timers fake: every timer fires in arm order at one instant, its delay ignored. The row must refuse it on the
// virtual order.
import { makeTimers } from '../good/timers.mjs';

export const specifier = 'node:timers';
export const expectRefused = ['virtual order'];
export const create = (env) => makeTimers(env, { armOrder: true });
