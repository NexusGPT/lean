// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).

export function outside(k: number): number { const spare = k + 1; let c = k * 2; const o = { get(): number { return c; } }; c++; return o.get(); }
export function inside(k: number): number { let c = k * 2; const o = { get(): number { return c + 1; } }; c++; return o.get(); }
export function planted(k: number): number { let c = k * 2; const o = { get(): number { return (c) + 1; } }; c++; return o.get(); } // exec/mutate.mjs parent.ts --unit planted --index 2 (changed-return)
export function flows(k: number): number { let c = k * 3; const o = { get(): number { return c; } }; c++; return o.get(); }
