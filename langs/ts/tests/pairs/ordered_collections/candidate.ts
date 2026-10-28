// Stage 5 rank 22: a Map and a Set are ordered collections. Insertion order is a fact of the value, so two maps that
// received the same entries in another order are two values (ECMA-262 24.1 and 24.2).

// the keys of a map built in the other order: ["b", "a"] where the parent returns ["a", "b"]
export function orderOf(a: string, b: string): string[] {
  const m = new Map<string, number>();
  m.set(b, 2);
  m.set(a, 1);
  return [...m.keys()];
}

// the same entries in the same order, through the constructor
export function table(a: string, b: string): [string, number][] {
  const m = new Map<string, number>([[a, a.length], [b, b.length]]);
  return [...m.entries()];
}

// the two set calls swapped: the iteration meets y first
export function weighted(a: string, b: string, x: number, y: number): number {
  const m = new Map<string, number>();
  m.set(b, y);
  m.set(a, x);
  let out = 0;
  let w = 1;
  for (const [, v] of m) {
    out = out + v * w;
    w = w * 10;
  }
  return out;
}

// the first places of three names, by a Set spread back: a repeated item keeps its first place
export function firstPlaces(a: string, b: string): string[] {
  return [...new Set([a, b, a])];
}

// untouched: a count per name, read back through keys() in a for-of, Array.from of values() and a Set's size
export function tally(xs: string[]): number {
  const m = new Map<string, number>();
  for (const x of xs) {
    m.set(x, (m.get(x) ?? 0) + 1);
  }
  let best = 0;
  for (const k of m.keys()) {
    best = Math.max(best, m.get(k) ?? 0);
  }
  return best * 100 + Array.from(m.values()).length * 10 + new Set(xs).size;
}
