// localStorage and sessionStorage as a record (the HTML standard's Storage interface over a finite map of texts).
//
// What the store held before the unit ran is a fact of the world, drawn once per input and area: each of the unit's own
// strings (spec.mjs: the strings its source compares against, where a storage key the unit names stands) is present on
// about half the inputs, holding a drawn text (draw.mjs drawText: one of the unit's strings, the empty text, a JSON text
// of each kind). The draw depends on the seed, the area and the key only, so both sides of an input start from the same
// store and a key read in another order reads the same. From there the store is the standard's: setItem stores the
// text of its value, getItem answers what was stored or null, removeItem and clear empty it, `length` and `key(i)`
// enumerate it in insertion order, and a named property is an item (`localStorage.theme`, `localStorage.theme = x`,
// `delete localStorage.theme`, `Object.keys(localStorage)`), the interface's own members taking precedence.
//
// Every write (setItem, removeItem, clear, and the named-property forms) is a request to the world and is recorded on
// the trace as `call global:<area>.<method>` with its arguments, in order: another tab and the next session see them.
// A read is no request: what it answers flows into the outcome, where a different key or a missing write shows.
import { unitDraw, drawText } from './draw.mjs';

const PRESENT = 0.5;
const METHODS = ['getItem', 'setItem', 'removeItem', 'clear', 'key'];

export function storageArea(env, area) {
  const name = `global:${area}`;
  let items = null; // Map key -> text, drawn on first use (the unit's strings are known once its spec is set)
  const store = () => {
    if (items) return items;
    items = new Map();
    for (const k of [...new Set((env.shapes?.strings ?? []).filter((s) => typeof s === 'string'))].sort()) if (unitDraw(env, `${area}:present`, k) < PRESENT) items.set(k, drawText(env, `${area}:value`, k));
    return items;
  };
  const write = (method, args) => env.record('call', `${name}.${method}`, args);
  const api = {
    getItem(k) { const m = store(); k = String(k); return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (arguments.length < 2) throw new TypeError(`Failed to execute 'setItem' on 'Storage': 2 arguments required, but only ${arguments.length} present.`); k = String(k); v = String(v); write('setItem', [k, v]); store().set(k, v); },
    removeItem(k) { k = String(k); write('removeItem', [k]); store().delete(k); },
    clear() { write('clear', []); store().clear(); },
    key(i) { const ks = [...store().keys()]; const n = Math.trunc(Number(i)) || 0; return n >= 0 && n < ks.length ? ks[n] : null; },
  };
  const target = Object.create(null);
  const proxy = new Proxy(target, {
    get(t, p) {
      if (p === 'length') return store().size;
      if (typeof p === 'symbol') return p === Symbol.toStringTag ? 'Storage' : undefined;
      if (METHODS.includes(p)) return api[p];
      const m = store(); return m.has(p) ? m.get(p) : undefined;
    },
    set(t, p, v) { if (typeof p === 'symbol') return false; api.setItem(p, v); return true; },
    deleteProperty(t, p) { if (typeof p !== 'symbol') api.removeItem(p); return true; },
    has(t, p) { return p === 'length' || METHODS.includes(p) || (typeof p === 'string' && store().has(p)); },
    ownKeys() { return [...store().keys()]; },
    getOwnPropertyDescriptor(t, p) { const m = store(); return typeof p === 'string' && m.has(p) ? { value: m.get(p), writable: true, enumerable: true, configurable: true } : undefined; },
    defineProperty(t, p, d) { if ('value' in d) api.setItem(p, d.value); return true; },
  });
  return { proxy, entries: () => [...store().entries()] };
}

const areas = new WeakMap(); // a storage proxy -> its area, for rendering
export function storageGlobals(env) {
  const out = {};
  for (const area of ['localStorage', 'sessionStorage']) { const s = storageArea(env, area); areas.set(s.proxy, s); out[area] = s.proxy; }
  return out;
}
// a store rendered by its items, in insertion order (a unit that returns or stores the Storage object itself)
export const storageOf = (v) => areas.get(v) ?? null;
