// expect: exception-callback
function leaf(x: number): number { if (x < 0) throw "bad"; return x; }
export function f(xs: number[]): number[] { return xs.map(leaf); }
