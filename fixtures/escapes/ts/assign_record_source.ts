// expect: assign-target
// Object.assign copies every own enumerable key of its source; a value of a declared record type may carry keys its
// type does not name (structural typing), so `Object.assign(t, s)` is not the writes of the declared fields: with
// `s = { a: 1, b: "x", c: true }` it adds `c` to `t`, which `t.a = s.a; t.b = s.b` does not. Only a literal source,
// whose keys are its text, is read.
export interface Rec { a: number; b: string }
export function copyInto(t: Rec, s: Rec): void {
  Object.assign(t, s);
}
