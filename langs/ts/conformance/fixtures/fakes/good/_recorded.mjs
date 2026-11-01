// The fixture fakes' shared helper (not a fake: no `create`): a module object whose every function member is the real
// one, each call recorded on the environment's trace first, so a pure fake is the real function plus the trace.
import { render } from '../../../../exec/fake.mjs';

export function recorded(env, prefix, real, members) {
  const out = {};
  for (const k of members) {
    const v = real[k];
    if (typeof v !== 'function') { out[k] = v; continue; }
    const isClass = /^[A-Z]/.test(k);
    out[k] = isClass
      ? new Proxy(v, { construct(t, args) { env.record('construct', `${prefix}.${k}`, args.map((x) => render(x))); return Reflect.construct(t, args); }, apply(t, self, args) { env.record('call', `${prefix}.${k}`, args.map((x) => render(x))); return Reflect.apply(t, self, args); } })
      : function (...args) { env.record('call', `${prefix}.${k}`, args.map((x) => render(x))); return v.apply(real, args); };
  }
  return out;
}
