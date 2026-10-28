function g(y: {n:number}): number { let b = y; b.n++; return b.n; }
export function f(x: {n:number}): number { return g(x); }
