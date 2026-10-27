// expect: bound-function
type Ctx = { k: number };
function scaled(this: Ctx, n: number): number { return this.k * n; }
export function later(o: Ctx): (n: number) => number { return scaled.bind(o); }
