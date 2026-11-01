// `console`: a captured log. Every call is already a request on the trace (its path and rendered arguments: the log
// line as the unit wrote it); the model answers what Node's console answers, `undefined`, and never faults (writing a
// log line is no request that can fail).
import { entries } from './common.mjs';

const METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'dirxml', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert', 'clear'];
export function consoleModel() {
  const calls = Object.fromEntries(METHODS.map((m) => [m, () => undefined]));
  return entries({ name: 'console', calls, pure: METHODS });
}
