// A minimal console fake (fixture until w2b's exec/fakes/console.mjs lands): every call a record on the trace, nothing
// written to the real output.
import { render } from '../../../../exec/fake.mjs';

export const specifier = 'node:console';
export function create(env) {
  const out = {};
  for (const m of ['log', 'warn', 'error', 'info', 'debug']) out[m] = (...args) => { env.record('call', `console.${m}`, args.map((x) => render(x))); };
  return out;
}
