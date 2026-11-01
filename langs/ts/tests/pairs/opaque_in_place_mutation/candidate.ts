// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export function outside(k: number): number[] { const spare = k + 1; const a = k * 2; const xs = [a, 2]; return xs.reverse(); }
export function inside(k: number): number[] { const a = k * 2; const xs = [a, 3]; return xs.reverse(); }
export function planted(k: number): number[] { const a = k * 2; const xs = [a, 3]; return xs.reverse(); } // exec/mutate.mjs parent.ts --unit planted --index 2 (boundary)
export function flows(k: number): number[] { const a = k * 3; const xs = [a, 2]; return xs.reverse(); }
