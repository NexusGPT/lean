// (a) outside: a statement added before the block (`const spare = k + 1`), the block unchanged: proved, the step listed.
// (b) inside: an edit inside the block: another symbol, never proved.
// (c) planted: mutate.mjs's change inside the block: never proved.
// flows: `k * 3` reaches the block only through its scalar read: not proved; proved with that read dropped (the break).
type Box = { n: number; tags: number[]; inner: { v: number } };
function pick(n: number, b: Box): { v: number } { return b.inner; }
export function outside(b: Box, k: number): number { const spare = k + 1; const a = k * 2; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function inside(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a + 1; return b.inner.v + a; }
export function planted(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return (b.inner.v + a) + 1; } // exec/mutate.mjs parent.ts --unit planted --index 3 (changed-return)
export function flows(b: Box, k: number): number { const a = k * 3; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function count(user: { tags: number[] }, k: number): number { const n = user.tags.length; const t = user.tags; if (k === 7919) t.push(k); return n; }
function bonus(x: number): number { return x === 7919 ? 2 : 0; }
export function viaCallee(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = bonus(k); return b.inner.v + a; }
export function bump(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return a; }
export function after(b: Box, k: number): number { const v = b.inner.v; bump(b, k); return v; }
