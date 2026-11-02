export type Pt = { a: number; b: string };

// handed_key_order_callee: a record the unit builds, handed to a same-file function that hands its parameter to the
// outside (JSON.stringify writes the keys in property order). The callee reads its parameter as an object it did not
// build, so the order is the caller's to hand (translate.mjs paramReadsOrder). Each unit below hands a literal in one
// order here and in another (or the same) in the candidate.
function enc(o: Pt): string { return JSON.stringify(o); }
function encVia(o: Pt): string { return enc(o); }
function sum(o: Pt): number { return o.a + o.b.length; }
export function viaHelper(x: number, y: string): string { return enc({ b: y, a: x }); }
export function spreadHelper(x: number, y: string): string { return enc({ ...{ b: y, a: x } }); }
export function viaTwo(x: number, y: string): string { return encVia({ b: y, a: x }); }
export function sameOrder(x: number, y: string): string { const k = x; return enc({ a: k, b: y }); }
export function fieldsOnly(x: number, y: string): number { return sum({ b: y, a: x }); }
