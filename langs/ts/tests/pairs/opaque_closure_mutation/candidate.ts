// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export function outside(k: number): number { const spare = k + 1; const a = k * 2; let next = a; const step = (): number => { const i = next++; return i * 2; }; return step() + step(); }
export function inside(k: number): number { const a = k * 2; let next = a; const step = (): number => { const i = next++; return i * 3; }; return step() + step(); }
export function planted(k: number): number { const a = k * 2; let next = a; const step = (): number => { const i = next++; return (i * 2) + 1; }; return step() + step(); } // exec/mutate.mjs parent.ts --unit planted --index 2 (changed-return)
export function flows(k: number): number { const a = k * 3; let next = a; const step = (): number => { const i = next++; return i * 2; }; return step() + step(); }
