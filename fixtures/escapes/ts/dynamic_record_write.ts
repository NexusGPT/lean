// expect: index-assign
export function write(r: { a: number; b: number }, k: "a" | "b"): number { r[k] = 1; return r.a; }
