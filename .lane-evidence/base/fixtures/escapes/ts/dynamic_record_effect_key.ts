// expect: dynamic-key
function change(r: { a: number; b: number }): "a" | "b" { r.a += 1; return "a"; }
export function read(r: { a: number; b: number }): number { return r[change(r)]; }
