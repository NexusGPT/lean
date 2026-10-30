// bound-function: a bound value called at once is the direct call where the lint decides the target never reads `this`;
// a held bound value is listed
function add(a: number, b: number): number { return a + b; }
export function plusOne(n: number): number { return add(1, n); }

type Ctx = { k: number };
function scaled(this: Ctx, n: number): number { return this.k * n; }
export function later(o: Ctx): (n: number) => number { return scaled.bind(o); }
