// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export const Outside = { n: 1, bump(k: number): number { const spare = k + 1; const a = k * 2; this.n = a; return this.n + a; } };
export const Inside = { n: 1, bump(k: number): number { const a = k * 2; this.n = a + 1; return this.n + a; } };
export const Planted = { n: 1, bump(k: number): number { const a = k * 2; this.n = a; return (this.n + a) + 1; } }; // exec/mutate.mjs parent.ts --unit Planted.bump --index 2 (changed-return)
export const Flows = { n: 1, bump(k: number): number { const a = k * 3; this.n = a; return this.n + a; } };
export function reader(k: number): number { const n = Outside.n; Outside.bump(k); return n; }
