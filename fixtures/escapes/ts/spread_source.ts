// expect: spread-source
// A record copy carries everything its source carries. Written after other members, a spread writes over them, an own
// key holding undefined included: with `s = { b: "x", a: undefined }` the literal below holds `a: undefined`, which
// `{ a: 1, b: s.b }` does not. The copy term (an uninterpreted copy of s, then the members written after it) needs the
// spread first in its literal, so a record spread after other members is refused.
export interface Opt { a?: number; b: string }
export interface Rec { a: number; b: string }
export function late(s: Opt): Rec {
  return { a: 1, ...s, b: s.b };
}
