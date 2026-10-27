// The heap core, stage 4: a dictionary is a cell of insertion-ordered keys beside a map. A key the dictionary does not
// own reads undefined (or a function of Object.prototype), so a read is proved only after the key is written.

// marks a word as seen
export function put(d: Record<string, number>, k: string): number {
  d[k] = 1;
  return 1;
}

// writes two keys, x then y
export function both(d: Record<string, number>): number {
  d["x"] = 1;
  d["y"] = 2;
  return 2;
}

// stores a count
export function store(d: Record<string, number>, k: string, v: number): number {
  d[k] = v;
  return v;
}

// stores a count and reads it back
export function readBack(d: Record<string, number>, k: string, v: number): number {
  d[k] = v;
  return d[k];
}

// whether a word is there, Object.prototype's keys included
export function has(d: Record<string, number>, k: string): boolean {
  return k in d;
}
