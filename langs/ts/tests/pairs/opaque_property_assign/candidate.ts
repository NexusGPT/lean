// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).
type Box = { n: number; tags: number[]; inner: { v: number } };
export function outside(b: Box, k: number): number { const spare = k + 1; const a = k * 2; b.n ||= a; return b.n + a; }
export function inside(b: Box, k: number): number { const a = k * 2; b.n ||= a + 1; return b.n + a; }
export function planted(b: Box, k: number): number { const a = k * 2; b.n ||= a; return (b.n + a) + 1; } // exec/mutate.mjs parent.ts --unit planted --index 2 (changed-return)
export function flows(b: Box, k: number): number { const a = k * 3; b.n ||= a; return b.n + a; }
