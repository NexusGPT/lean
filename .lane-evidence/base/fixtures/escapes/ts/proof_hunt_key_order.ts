// expect: key-order
// class 5 of design/proof-hunt.md: for-in over a record parameter or a copy of it lists its keys in the order and
// presence the value was created with, which a datatype of the declared fields does not hold
export function keysOfParam(p: { a: number; b: number }): string { let s = ""; for (const k in p) s += k; return s; }
export function keysOfCopy(p: { a: number; b: number }): string { const q = { b: p.b, a: p.a }; let s = ""; for (const k in q) s += k; return s; }
export function optKeys(p: { a?: number; b: number }): string { const q = { ...p }; let s = ""; for (const k in q) s += k; return s; }
export function optKeysCopy(p: { a?: number; b: number }): string { const q = { a: p.a, b: p.b }; let s = ""; for (const k in q) s += k; return s; }
// class 1 of the proof hunt, moved from pair proof_hunt_1 (28 Oct): a for-in over an open record parameter, parent and candidate forms
export function keysHParam(h: H): number { let n = 0; for (const k in h) n = n + 1; return n; }
export function keysHCopy(h: H): number { const c: H = { accept: h.accept }; let n = 0; for (const k in c) n = n + 1; return n; }
