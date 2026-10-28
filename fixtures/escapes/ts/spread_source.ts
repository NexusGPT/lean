// expect: spread-source
// A record copy carries everything its source carries. `Object.assign({}, s)` is read as a function of its arguments'
// values, and a record value holds its declared fields alone, so with `s = { a: 1, b: "x", k0: true }` it would read
// alike with `Object.assign({}, { a: s.a, b: s.b })`, which drops `k0`. Write the copy as a spread `{ ...s }`, read as an
// uninterpreted copy of s.
export interface Bag { a: number; b: string; [k: string]: unknown }
export function assignBag(s: Bag): Bag {
  return Object.assign({}, s);
}
