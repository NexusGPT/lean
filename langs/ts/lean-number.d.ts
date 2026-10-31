// The uninterpreted number operations of the faithful number reading (translate/faithful.mjs, design/doubles.md): a
// double the Dafny model does not compute is passed through these, which the translator reads as pure externals keyed
// by name, the same symbol on both sides. A root of the rewritten program only; no source file names them.
interface Math {
  __lean_add(a: number, b: number): number; __lean_sub(a: number, b: number): number; __lean_mul(a: number, b: number): number;
  __lean_div(a: number, b: number): number; __lean_rem(a: number, b: number): number;
  __lean_bitand(a: number, b: number): number; __lean_bitor(a: number, b: number): number; __lean_bitxor(a: number, b: number): number;
  __lean_shl(a: number, b: number): number; __lean_shr(a: number, b: number): number; __lean_ushr(a: number, b: number): number;
  __lean_bitnot(a: number): number; __lean_neg(a: number): number; __lean_int32(a: number): number;
  __lean_lt(a: number, b: number): boolean; __lean_le(a: number, b: number): boolean; __lean_gt(a: number, b: number): boolean; __lean_ge(a: number, b: number): boolean;
  __lean_eq(a: number, b: number): boolean; __lean_truthy(a: number): boolean;
  __lean_floor1(a: number): number; __lean_ceil1(a: number): number; __lean_trunc1(a: number): number; __lean_round1(a: number): number;
  __lean_abs1(a: number): number; __lean_sign1(a: number): number; __lean_sqrt1(a: number): number; __lean_fround1(a: number): number; __lean_clz321(a: number): number;
  __lean_imul2(a: number, b: number): number;
  __lean_min0(): number; __lean_min1(a: number): number; __lean_min2(a: number, b: number): number; __lean_min3(a: number, b: number, c: number): number; __lean_min4(a: number, b: number, c: number, d: number): number;
  __lean_mins(xs: readonly number[]): number; __lean_maxs(xs: readonly number[]): number;
  __lean_max0(): number; __lean_max1(a: number): number; __lean_max2(a: number, b: number): number; __lean_max3(a: number, b: number, c: number): number; __lean_max4(a: number, b: number, c: number, d: number): number;
}
