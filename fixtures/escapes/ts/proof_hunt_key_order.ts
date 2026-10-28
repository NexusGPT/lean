// expect: key-order
// class 5 of design/proof-hunt.md: for-in over a record parameter or a copy of it lists its keys in the order and
// presence the value was created with, which a datatype of the declared fields does not hold
export function keysOfParam(p: { a: number; b: number }): string { let s = ""; for (const k in p) s += k; return s; }
export function keysOfCopy(p: { a: number; b: number }): string { const q = { b: p.b, a: p.a }; let s = ""; for (const k in q) s += k; return s; }
export function optKeys(p: { a?: number; b: number }): string { const q = { ...p }; let s = ""; for (const k in q) s += k; return s; }
export function optKeysCopy(p: { a?: number; b: number }): string { const q = { a: p.a, b: p.b }; let s = ""; for (const k in q) s += k; return s; }
