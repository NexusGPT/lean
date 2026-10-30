// type_assertions: `e as T` checks nothing at run time, and neither does an any or unknown value filling a typed slot.
// Such a value is read with its real type (the source's, or the opaque Any), so `v` and `v + 0` stay different terms
import { makeClient } from "./client";
export type Mode = "a" | "b";
export type Wide = "a" | "b" | "c";

// any narrowed to number without the keyword: a string flows on, so `+ 0` appends "0"
export function anyAs(x: any): number {
  const n: number = x;
  return n + 0;
}

// a union asserted to one member: a string flows on
export function asCast(x: string | number): number {
  return (x as number) + 0;
}

// unknown asserted to string: a number flows on, so `+ ""` turns it into a string
export function unknownAs(x: unknown): string {
  return (x as string) + "";
}

// any asserted to a record: the parsed value may lack the field or hold another type in it
export function parsedA(s: string): number {
  const o = JSON.parse(s) as { a: number };
  return o.a + 0;
}

// any in a slot that admits absence: opaque in its definedness and its payload, so a string payload stays a string
export function optAny(v: any): string {
  const s: string | undefined = v;
  return s === undefined ? "none" : s + "";
}

// the same slot filled by a checked value: the payload is a number, read exactly
export function optChecked(x: unknown): number {
  const n = typeof x === "number" ? x : undefined;
  return n === undefined ? 0 : n + 0;
}

// an assertion to a supertype: the string passes through
export function widen(x: string): string | number {
  return x;
}

// an assertion within a literal union, from a member to the union: the value passes through
export function rank(m: Mode): number {
  const w = m as Wide;
  return w === "b" ? 2 : w === "a" ? 1 : 3;
}

// a number asserted to a literal union: read as the number it is, so arithmetic on it is exact
export function bump(n: number): number {
  const k = n as 1 | 2;
  return 1 + k;
}

// the same operation on an opaque value on both sides: the same uninterpreted term
export function twice(x: any): number {
  const n: number = x;
  return n + n;
}

// no assertion
export function plain(x: number): number {
  return 1 + x;
}

// a held value in a field of a literal: the field is typed Any in the literal's datatype, so the unit's result is the
// same uninterpreted conversion of the same record on both sides
export function fieldHeld(x: any): { v: number } {
  const v = x as number;
  return { v };
}

// the same field holding `+ 0` of the held value: an operation on Any, a different record ("a" + 0 is "a0")
export function fieldBumped(x: any): { v: number } {
  return { v: (x as number) + 0 };
}

// a same-file callee given a held value: it is read once more at Any for that call, so its sum is the sum on Any
export function paramHeld(x: any): string {
  const n: number = x;
  return `${n + n}`;
}

// the callee's `+ 0` on the held value is an operation on Any: the string flows on and gains a "0"
export function paramKept(x: any): string {
  return `${x as number}`;
}

// a same-file unit whose result is held returns Any: its caller reads the value it is
export function resultHeld(x: unknown): string {
  return `${x as number}`;
}

// `+ 0` on what such a unit returns is an operation on Any
export function resultBumped(x: unknown): string {
  return `${x as number}`;
}

// a compound write of a held value reads the target's real type: `t += v` on an Any total is the sum on Any
export function compoundHeld(x: any): string {
  const v: number = x;
  return `${0 + v}`;
}

// the same write against `0 + v` read as numbers: "a" makes "0a", which the number reading would call 0 + v
export function compoundBumped(x: any): string {
  const v: number = x;
  return `${v}`;
}

// a held literal handed to a method of a local an imported factory made: the callee is declared outside the file, so
// the literal reaches it as an outside call's input, the same uninterpreted conversion of the same record on both sides
export function outsideHeld(x: any): string {
  const v = x as number;
  const client = makeClient();
  return client.analytics.exportCsv({ v });
}

// the same call given `+ 0` of the held value: an operation on Any, a different record the outside receives ("a0")
export function outsideBumped(x: any): string {
  const client = makeClient();
  return client.analytics.exportCsv({ v: (x as number) + 0 });
}

// a held value summed with a number: the faithful reading must not make it a number (a commutative double sum), since
// "a" + 1 is "a1" and 1 + "a" is "1a"
export function heldSum(x: any): string {
  return `${1 + (x as number)}`;
}
