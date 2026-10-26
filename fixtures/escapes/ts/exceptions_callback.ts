// expect: exception-callback
export function f(xs: number[]): number[] { return xs.map((x) => { if (x < 0) throw "bad"; return x; }); }
