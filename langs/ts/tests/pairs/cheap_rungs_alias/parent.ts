function g(x: {n:number}): number { const a = x; a.n++; return a.n; }
export function f(x: {n:number}): number { return g(x); }
