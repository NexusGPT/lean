// receiver-mutation, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.
type H = { v: number; f(): void };
export class Outside { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; } }
export class Inside { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; } }
export class Planted { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; } }
export class Flows { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a; return this.h.v + a; } }
export function reader(k: number): number { const o = new Outside(); o.m(k); return o.h.v; }
