// amendment A3: the opaque step's key holds the same-file code the block reaches, and its prelude names the callees
// (`// CALLS:`); a callee that differs makes the theorem refuse the step (spec/theorem.py), never prove it.
type Box = { n: number; tags: number[]; inner: { v: number } };
function pick(n: number, b: Box): { v: number } { return b.inner; }
function bonus(x: number): number { return x === 7919 ? 2 : 0; }
export function viaCallee(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = bonus(k); return b.inner.v + a; }
