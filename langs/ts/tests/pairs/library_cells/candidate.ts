// The library transition table: map and filter with a pure callback, and the Map and Set cells, as heap transitions.
export function doubled(xs: number[]): number[] { return xs.map((m) => m + m); }
export function bigOnes(xs: number[]): number[] { return xs.filter((n) => n > 2); }
export function tally(counts: Map<string, number>, key: string, n: number): number { counts.set(key, n); counts.set(key, n); return counts.size; }
export function remember(seen: Set<string>, key: string): number { seen.add(key); return seen.size; }
export function known(seen: Set<string>, key: string): boolean { return seen.has(key); }
export function drop(counts: Map<string, number>, key: string): number { return counts.size; }
export function freshMap(): number { const m = new Map<string, number>(); m.set("a", 1); m.set("a", 1); return m.size; }
