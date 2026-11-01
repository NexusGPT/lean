// Units no parent holds, read against their declarations (design/w1h-new-units.md). This file imports nothing, so a
// call that asks nothing of the world is a fact about the declaration alone.
import type { Missing } from "./nowhere-declared";

// (a) throws on undefined, which `string | undefined` admits: new:fault naming the input
export function head(s: string | undefined): string {
  return s!.slice(0, 1);
}

// (b) throws on a lone surrogate, a string the type admits and lane B's generator never draws: new:fault from the edge
// inputs (LEAN_BREAK=declared-edges removes them and the record goes)
export function encode(s: string): string {
  return encodeURIComponent(s);
}

// (c) the same shape, guarded: no record
export function headOr(s: string | undefined): string {
  return s === undefined ? "" : s.slice(0, 1);
}

/**
 * (d) a throw the declaration names: no record (LEAN_BREAK=declared-throws reads the tag no more)
 * @throws {RangeError} when n is negative
 */
export function sqrt(n: number): number {
  if (n < 0) throw new RangeError("negative");
  return Math.sqrt(n);
}

// (e) an assertion function declares its throw: no record
export function defined(x: string | undefined): asserts x is string {
  if (x === undefined) throw new Error("undefined");
}

// (f) a rejected promise on an admitted input: new:fault, how rejected
export async function size(s: string | undefined): Promise<number> {
  return s!.length;
}

// (g) a parameter whose type does not resolve: no drawn value is known to be one of it, so no fault is claimed, and the
// unit's coverage record says why (LEAN_BREAK=admitted-input claims it)
export function opaque(x: Missing): number {
  throw new Error("always");
}
