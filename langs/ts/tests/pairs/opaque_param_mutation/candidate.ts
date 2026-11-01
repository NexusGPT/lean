// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export function outside(xs: number[], k: number): number { const spare = k + 1; const a = k * 2; const y = a + (xs.pop() ?? 0); return y; }
export function inside(xs: number[], k: number): number { const a = k * 2; const y = a + (xs.pop() ?? 1); return y; }
export function planted(xs: number[], k: number): number { const a = k * 2; const y = a - (xs.pop() ?? 0); return y; } // exec/mutate.mjs parent.ts --unit planted --index 2 (operator)
export function flows(xs: number[], k: number): number { const a = k * 3; const y = a + (xs.pop() ?? 0); return y; }
