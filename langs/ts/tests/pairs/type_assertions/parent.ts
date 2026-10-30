// type_assertions: `e as T` checks nothing at run time, and neither does an any or unknown value filling a typed slot.
// Such a value is read with its real type (the source's, or the opaque Any), so `v` and `v + 0` stay different terms
export type Mode = "a" | "b";
export type Wide = "a" | "b" | "c";

// any narrowed to number without the keyword: a string flows on, so `+ 0` appends "0"
export function anyAs(x: any): number {
  const n: number = x;
  return n;
}

// a union asserted to one member: a string flows on
export function asCast(x: string | number): number {
  return x as number;
}

// unknown asserted to string: a number flows on, so `+ ""` turns it into a string
export function unknownAs(x: unknown): string {
  return x as string;
}

// any asserted to a record: the parsed value may lack the field or hold another type in it
export function parsedA(s: string): number {
  const o = JSON.parse(s) as { a: number };
  return o.a;
}

// any in a slot that admits absence: opaque in its definedness and its payload, so a string payload stays a string
export function optAny(v: any): string {
  const s: string | undefined = v;
  return s === undefined ? "none" : s;
}

// the same slot filled by a checked value: the payload is a number, read exactly
export function optChecked(x: unknown): number {
  const n = typeof x === "number" ? x : undefined;
  return n === undefined ? 0 : n;
}

// an assertion to a supertype: the string passes through
export function widen(x: string): string | number {
  return x as string | number;
}

// an assertion within a literal union, from a member to the union: the value passes through
export function rank(m: Mode): number {
  const w = m as Wide;
  return w === "a" ? 1 : w === "b" ? 2 : 3;
}

// a number asserted to a literal union: read as the number it is, so arithmetic on it is exact
export function bump(n: number): number {
  const k = n as 1 | 2;
  return k + 1;
}

// the same operation on an opaque value on both sides: the same uninterpreted term
export function twice(x: any): number {
  const n: number = x;
  return n + n;
}

// no assertion
export function plain(x: number): number {
  return x + 1;
}

// a held value in a field of a literal: the field is typed Any in the literal's datatype, so the unit's result is the
// same uninterpreted conversion of the same record on both sides
export function fieldHeld(x: any): { v: number } {
  return { v: x as number };
}

// the same field holding `+ 0` of the held value: an operation on Any, a different record ("a" + 0 is "a0")
export function fieldBumped(x: any): { v: number } {
  return { v: x as number };
}

// a same-file callee given a held value: it is read once more at Any for that call, so its sum is the sum on Any
function dbl(n: number): number {
  return n + n;
}
export function paramHeld(x: any): string {
  return `${dbl(x as number)}`;
}

// the callee's `+ 0` on the held value is an operation on Any: the string flows on and gains a "0"
function keep(n: number): number {
  return n + 0;
}
export function paramKept(x: any): string {
  return `${keep(x as number)}`;
}

// a same-file unit whose result is held returns Any: its caller reads the value it is
function asNum(x: unknown): number {
  return x as number;
}
export function resultHeld(x: unknown): string {
  return `${asNum(x)}`;
}

// `+ 0` on what such a unit returns is an operation on Any
export function resultBumped(x: unknown): string {
  return `${asNum(x) + 0}`;
}

// a compound write of a held value reads the target's real type: `t += v` on an Any total is the sum on Any
export function compoundHeld(x: any): string {
  let t = 0;
  t += x as number;
  return `${t}`;
}

// the same write against `0 + v` read as numbers: "a" makes "0a", which the number reading would call 0 + v
export function compoundBumped(x: any): string {
  let t = 0;
  t += x as number;
  return `${t}`;
}

// a held value summed with a number: the faithful reading must not make it a number (a commutative double sum), since
// "a" + 1 is "a1" and 1 + "a" is "1a"
export function heldSum(x: any): string {
  return `${(x as number) + 1}`;
}
