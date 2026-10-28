// A free function's declared `this` parameter (TypeScript's this parameter) is its receiver: its self type is the
// declared type, read as a first operand; a block read as one transition takes the receiver as an input.
export interface Ctx { base: number; offset: number; next(n: number): number; fetch(n: number): Promise<number>; helper(n: number): number }
export type Rec = { f: number; g: number };
// reads a field of the receiver
export function sum(this: Ctx, x: number): number { return this.base + x; }
// reads a field of the receiver
export function shifted(this: Ctx, x: number): number { return this.base + x; }
// calls a method of the receiver: an outside call on the receiver operand
export function viaHelper(this: Ctx, x: number): number { return this.helper(x) + 1; }
// a loop without a bound is one transition; the receiver is one of its inputs
export function climb(this: Ctx, x: number): number { let i = x; while (i < this.base) { i = this.next(i); } return i * 2; }
// the same loop
export function climbOther(this: Ctx, x: number): number { let i = x; while (i < this.base) { i = this.next(i); } return i; }
// pages through an outside source on the receiver
export async function pages(this: Ctx, x: number): Promise<number> { let total = 0; let r = 0; do { r = await this.fetch(x); total += r; } while (r > 0); return total; }
// writes the receiver inside a loop read as one transition: the receiver is an output of the block
export function bump(this: Rec, x: number): number { let i = 0; while (i < x) { this.f = this.f + 1; i = i + 1; } return this.f; }
// the same writes
export function bumpRead(this: Rec, x: number): number { let i = 0; while (i < x) { this.f = this.f + 1; i = i + 1; } return this.f; }
// a caller that binds the receiver with call
export function bumpVia(r: Rec, x: number): number { return bumpRead.call(r, x) + r.g; }
// a counted loop reads the receiver: the loop helper takes it as a const operand
export function tally(this: Ctx, xs: number[]): number { let s = 0; for (const x of xs) { s = s + x + this.base; } return s * 2; }
// the same loop
export function tallyOther(this: Ctx, xs: number[]): number { let s = 0; for (const x of xs) { s = s + x + this.base; } return s; }
