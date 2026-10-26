// expect: exception-expression
function leaf(x: number): number { if (x < 0) throw "bad"; return x; }
export function f(x: number): number { return x && leaf(x); }
