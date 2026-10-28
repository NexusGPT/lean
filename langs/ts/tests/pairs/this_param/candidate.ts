// A free function's declared `this` parameter (TypeScript's this parameter) is its receiver: its self type is the
// declared type, read as a first operand; a block read as one transition takes the receiver as an input.
export interface Ctx { base: number; offset: number; next(n: number): number; fetch(n: number): Promise<number>; helper(n: number): number }
export type Rec = { f: number; g: number };
// the sum reordered: equal
export function sum(this: Ctx, x: number): number { return x + this.base; }
// another field of the receiver: different
export function shifted(this: Ctx, x: number): number { return this.offset + x; }
// calls a method of the receiver: an outside call on the receiver operand
export function viaHelper(this: Ctx, x: number): number { return this.helper(x) + 1; }
// the same loop, the result doubled by an addition: equal
export function climb(this: Ctx, x: number): number { let i = x; while (i < this.base) { i = this.next(i); } return i + i; }
// the loop bounded by another field: different
export function climbOther(this: Ctx, x: number): number { let i = x; while (i < this.offset) { i = this.next(i); } return i; }
// pages through an outside source on the receiver
export async function pages(this: Ctx, x: number): Promise<number> { let total = 0; let r = 0; do { r = await this.fetch(x); total += r; } while (r > 0); return total; }
// the field read after the loop through a local: equal
export function bump(this: Rec, x: number): number { let i = 0; while (i < x) { this.f = this.f + 1; i = i + 1; } const out = this.f; return out; }
// the field read before the loop: different whenever the loop runs
export function bumpRead(this: Rec, x: number): number { const before = this.f; let i = 0; while (i < x) { this.f = this.f + 1; i = i + 1; } return before; }
// a caller that binds the receiver with call
export function bumpVia(r: Rec, x: number): number { return bumpRead.call(r, x) + r.g; }
