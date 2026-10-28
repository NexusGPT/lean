// expect: spread-source
// A spread copies every own enumerable key of its source (CopyDataProperties), and a value of a record type may carry
// keys its type does not name: with `s = { a: 1, b: "x", k0: true }` the copy below holds `k0`, which `{ a: s.a, b: s.b }`
// does not. The readings hold the declared fields alone, so a record is copied only from keys the function built.
export interface Bag { a: number; b: string; [k: string]: unknown }
export function copyBag(s: Bag): Bag {
  return { ...s };
}
