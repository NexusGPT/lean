// A minimal Web Storage fake (fixture until w2c's exec/fakes/web/storage.mjs lands): localStorage and sessionStorage as
// records in insertion order, values held as strings, every operation recorded.
export const specifier = ['global:localStorage', 'global:sessionStorage'];
function storage(env, name, seeded = {}) {
  const m = new Map(Object.entries(seeded).map(([k, v]) => [k, String(v)]));
  const rec = (op, args) => env.record('call', `${name}.${op}`, args);
  return {
    get length() { rec('length', []); return m.size; },
    key(i) { rec('key', [i]); const n = Math.trunc(Number(i)) || 0; return n < 0 ? null : [...m.keys()][n] ?? null; },
    getItem(k) { rec('getItem', [String(k)]); return m.has(String(k)) ? m.get(String(k)) : null; },
    setItem(k, v) { rec('setItem', [String(k), String(v)]); m.set(String(k), String(v)); },
    removeItem(k) { rec('removeItem', [String(k)]); m.delete(String(k)); },
    clear() { rec('clear', []); m.clear(); },
  };
}
export function create(env, recording = {}) {
  return { localStorage: storage(env, 'localStorage', recording.localStorage), sessionStorage: storage(env, 'sessionStorage', recording.sessionStorage) };
}
