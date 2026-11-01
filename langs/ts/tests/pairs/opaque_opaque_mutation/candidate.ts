// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).
function make(): any { return []; }
export function outside(k: number): number { const spare = k + 1; const a = k * 2; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
export function inside(k: number): number { const a = k * 2; const x = make(); const n = x.push(a, a); return a + (n > 1 ? 1 : 0); }
export function planted(k: number): number { const a = k * 2; const x = make(); const n = x.push(a); return (a + (n > 1 ? 1 : 0)) + 1; } // exec/mutate.mjs parent.ts --unit planted --index 2 (changed-return)
export function flows(k: number): number { const a = k * 3; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
