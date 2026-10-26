// expect: dynamic-key
export function read(r: { a(): number; b(): number }, k: "a" | "b"): () => number { return r[k]; }
