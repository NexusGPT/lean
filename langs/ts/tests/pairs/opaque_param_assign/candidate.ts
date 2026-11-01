// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export function outside(xs: number[], k: number): number { const spare = k + 1; const a = k * 2; xs.push(a); xs = [a, a]; return xs.length + a; }
export function inside(xs: number[], k: number): number { const a = k * 2; xs.push(a); xs = [a]; return xs.length + a; }
export function planted(xs: number[], k: number): number { const a = k * 2; xs.push(a); xs = [a, a]; return (xs.length + a) + 1; } // exec/mutate.mjs parent.ts --unit planted --index 3 (changed-return)
export function flows(xs: number[], k: number): number { const a = k * 3; xs.push(a); xs = [a, a]; return xs.length + a; }
