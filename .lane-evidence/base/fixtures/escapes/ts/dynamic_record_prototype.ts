// expect: prototype
export function read(r: { constructor: string; a: string }, k: "constructor" | "a"): string { return r[k]; }
