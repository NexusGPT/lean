// alias-mutation, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.
type Box = { n: number; tags: number[]; inner: { v: number } };
function pick(n: number, b: Box): { v: number } { return b.inner; }
export function outside(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function inside(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function planted(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function flows(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return b.inner.v + a; }
export function count(user: { tags: number[] }, k: number): number { const t = user.tags; if (k === 7919) t.push(k); return user.tags.length; }
export function bump(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return a; }
export function after(b: Box, k: number): number { bump(b, k); return b.inner.v; }
export class Store { static make(b: Box, k: number): number { const a = k * 2; const t = pick(a, b); t.v = a; return this.name.length + b.inner.v; } }
