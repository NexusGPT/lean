// w1d: the generator rules stay `none` (design/w1d-opaque-async.md): each finding keeps its refusal with the column's reason
export interface Svc { put(n: number): Promise<void>; }
// generator-bound: a generator with an unbounded loop has no measure (by design, ASK)
export function* naturals(n: number) { let i = n; while (true) { yield i; i++; } }
// generator-effect: the body of a sequence generator is its yields
export function* logged(svc: Svc, xs: number[]) { for (const x of xs) { svc.put(x); yield x; } }
// generator: a nested generator declaration is hoisted and suspends
export function outer(n: number): number { function* inner() { yield n; } let s = 0; for (const v of inner()) s += v; return s; }
