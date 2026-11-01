// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).
type H = { v: number; f(): void };
export function outside(this: { h: H }, k: number): number { const spare = k + 1; const a = k * 2; this.h.v = a; return this.h.v + a; }
export function inside(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a + 1; return this.h.v + a; }
export function planted(this: { h: H }, k: number): number { const a = k * 2; this.h.v = a; return (this.h.v + a) + 1; } // exec/mutate.mjs parent.ts --unit planted --index 2 (changed-return)
export function flows(this: { h: H }, k: number): number { const a = k * 3; this.h.v = a; return this.h.v + a; }
