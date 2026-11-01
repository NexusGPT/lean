// The opacity ladder (design/w1c-opaque-calls.md), rule `delete`: `delete` used as a value. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_del(o: { cache: { [k: string]: number } }, k: string, x: number): number {
  const n = x + 1;
  const r = delete o.cache[k];
  return r ? 2 * n : 0;
}

export function inside_del(o: { cache: { [k: string]: number } }, k: string, j: string): number {
  const r = delete o.cache[j];
  return r ? 1 : 0;
}

export function read_del(o: { cache: { [k: string]: number } }, k: string): number {
  const key = k + "b";
  const r = delete o.cache[key];
  return r ? 1 : 0;
}

export function write_del(o: { cache: { [k: string]: number } }, k: string): number {
  const had = k in o.cache ? 1 : 0;
  const r = delete o.cache[k];
  return (k in o.cache ? 1 : 0) + (r ? 1 : 0);
}

export function planted_del(o: { cache: { [k: string]: number } }, k: string, x: number): number {
  const r = delete o.cache[k] && x >= 0;
  return r ? 1 : 0;
}
