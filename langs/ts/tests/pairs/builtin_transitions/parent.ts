// Every generated row of the library transition table, called from the unit's own file: lane B records each call and
// checks it against its row while the unit runs (exec/transitions.mjs); the certificate carries the counts.
export function pushed(xs: number[], x: number): number[] { const ys = xs.slice(); ys.push(x); return ys; }
export function fronted(xs: number[], x: number): number[] { const ys = xs.slice(); ys.unshift(x); return ys; }
export function shifted(xs: number[]): number[] { const ys = xs.slice(); ys.shift(); return ys; }
export function cut(xs: number[]): number[] { const ys = xs.slice(); ys.splice(0, 1); return ys; }
export function flipped(xs: number[]): number[] { const ys = xs.slice(); ys.reverse(); return ys; }
export function joined(xs: number[], ys: number[]): number[] { return xs.concat(ys); }
export function doubled(xs: number[]): number[] { return xs.map((n) => n + n); }
export function evens(xs: number[]): number[] { return xs.filter((n) => n % 2 === 0); }
export function tallied(counts: Map<string, number>, key: string): number { if (counts.has(key)) { counts.set(key, (counts.get(key) ?? 0) + 1); } else { counts.set(key, 1); } counts.delete(""); return counts.size; }
export function remembered(seen: Set<string>, key: string): number { if (!seen.has(key)) { seen.add(key); } seen.delete(""); return seen.size; }
export function cutAt(xs: number[], i: number, k: number): number[] { const ys = xs.slice(); ys.splice(i, k); return ys; }
