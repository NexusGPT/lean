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
