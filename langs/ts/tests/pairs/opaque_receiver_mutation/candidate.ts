// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).
type H = { v: number; f(): void };
export class Outside { h: H = { v: 0, f() {} }; m(k: number): number { const spare = k + 1; const a = k * 2; this.h.v = a; return this.h.v + a; } }
export class Inside { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a + 1; return this.h.v + a; } }
export class Planted { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 2; this.h.v = a; return (this.h.v + a) + 1; } } // exec/mutate.mjs parent.ts --unit Planted.m --index 2 (changed-return)
export class Flows { h: H = { v: 0, f() {} }; m(k: number): number { const a = k * 3; this.h.v = a; return this.h.v + a; } }
export function reader(k: number): number { const o = new Outside(); const v = o.h.v; o.m(k); return v; }
