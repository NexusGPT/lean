// Explicit operands: the receiver of a free function is its declared `this` parameter, and `call`/`apply` pass it.
export type Ctx = { k: number; tag: string };
// a free function with a receiver
export function scaled(this: Ctx, n: number): number { return n * this.k; }
// the same receiver through apply: equal
export function viaCall(o: Ctx): number { return scaled.apply(o, [2]); }
// a fresh receiver with another k: different
export function viaApply(o: Ctx): number { return scaled.apply({ k: o.k + 1, tag: o.tag }, [3]); }
// the receiver's tag, read through the receiver
export function tagOf(this: Ctx): string { return this.tag + "!"; }
export function named(o: Ctx): string { return tagOf.call(o); }
