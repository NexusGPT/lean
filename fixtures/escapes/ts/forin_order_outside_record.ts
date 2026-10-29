// expect: key-order
// A for-in visits the own keys in creation order (ECMA-262 14.7.5.9, 10.1.11), and a record from the outside carries
// an order the function does not fix: the record value reading forgets it, so `{ a, b }` and `{ b, a }` would read alike.
// Loop over a const local a plain literal makes in the function, over a Record<string, T>, or over an array of the keys.
export function keysOfParam(p: { a: number; b: number }): string { let s = ""; for (const k in p) s += k; return s; }
export function spreadKeys(p: { a?: number; b: number }): string { const q = { ...p }; let s = ""; for (const k in q) s += k; return s; }
export function anyKeys(x: number, y: number): string { const o: any = { a: x, b: y }; let s = ""; for (const k in o) s += k; return s; }
function first(o: { a: number; b: number }): number { return o.a; }
export function handedOn(x: number, y: number): string { const o = { a: x, b: y }; first(o); let s = ""; for (const k in o) s += k; return s; }
