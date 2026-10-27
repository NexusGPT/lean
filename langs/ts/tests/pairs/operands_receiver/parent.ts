// Explicit operands: the receiver of a free function is its declared `this` parameter, and `call`/`apply` pass it.
export type Ctx = { k: number; tag: string };
// a free function with a receiver
export function scaled(this: Ctx, n: number): number { return this.k * n; }
// passes the receiver through call
export function viaCall(o: Ctx): number { return scaled.call(o, 2); }
// passes the receiver through apply with a literal argument list
export function viaApply(o: Ctx): number { return scaled.apply(o, [3]); }
// the receiver's tag, read through the receiver
export function tagOf(this: Ctx): string { return this.tag + "!"; }
export function named(o: Ctx): string { return tagOf.call(o); }
