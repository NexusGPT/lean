// receiver-write, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.
type H = { v: number; f(): void };
export function outside(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; }
export function inside(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; }
export function planted(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; }
export function flows(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; }
