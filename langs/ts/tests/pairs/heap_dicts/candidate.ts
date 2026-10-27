// The heap core, stage 4: a dictionary is a cell of insertion-ordered keys beside a map. A key the dictionary does not
// own reads undefined (or a function of Object.prototype), so a read is proved only after the key is written.

// marks another key
export function put(d: Record<string, number>, k: string): number {
  d[k + "!"] = 1;
  return 1;
}

// writes the same two keys, y then x: the same entries in another key order
export function both(d: Record<string, number>): number {
  d["y"] = 2;
  d["x"] = 1;
  return 2;
}

// the same write through a name
export function store(d: Record<string, number>, k: string, v: number): number {
  const w = v;
  d[k] = w;
  return w;
}

// the read through a name: the same JavaScript, but the key "__proto__" is not stored, and its read is not modelled
export function readBack(d: Record<string, number>, k: string, v: number): number {
  d[k] = v;
  const r = d[k];
  return r;
}

// whether a word is there
export function has(d: Record<string, number>, k: string): boolean {
  const r = k in d;
  return r;
}
