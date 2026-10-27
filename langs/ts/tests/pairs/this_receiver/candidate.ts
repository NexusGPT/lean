// A free function's declared receiver: `this` is its first operand, read as a whole value or through its fields.
export type Box = { n: number; label: string };
// the receiver's label, read through the receiver
export function caption(this: Box): string { return this.label + "!"; }
export function captionOf(b: Box): string { return caption.call(b); }
// the receiver as a whole value, passed on to another receiver function
export function sized(this: Box, k: number): number { return k * this.n; }
export function sizeOf(b: Box): number { return sized.apply(b, [2]); }
// untouched
export function same(this: Box): Box { return this; }
export function sameOf(b: Box): Box { return same.call(b); }
