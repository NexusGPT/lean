export function countKeys(o: Record<string, number>): number { let n = 0; for (const k in o) { if (o[k] >= 0) n += 1; } return n; }
export function names(o: Record<string, number>): string[] { return Object.keys(o); }
export function merged(a: { x: number }, b: { y: number }): { x: number; y: number } { return Object.assign({}, a, b); }
export function fromPairs(ps: readonly (readonly [string, number])[]): Record<string, number> { return Object.fromEntries(ps); }
