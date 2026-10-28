// A free function writing its declared receiver: `this` is its first operand, and a write through it rebuilds the
// receiver record, which the function hands back to its caller as it hands back a parameter it changes.
export type Tally = { n: number; last: number; meta: { hits: number } };
// a changed receiver write: the result is the same, the receiver is not
export function mark(this: Tally, k: number): number { this.n = this.n + k; this.last = this.n; return k; }
export function markTwice(t: Tally): number { mark.call(t, 1); mark.call(t, 2); return t.n; }
// a refactor: the same two writes, in the same order, as updates; the caller passes the receiver through call or apply
export function hit(this: Tally): number { this.meta.hits += 1; this.n += 1; return this.meta.hits; }
export function hitTwice(t: Tally): number { hit.apply(t, []); hit.call(t); return t.meta.hits + t.n; }
// untouched: a write of every field, then a read of the receiver passed through call
export function reset(this: Tally): void { this.n = 0; this.last = 0; this.meta.hits = 0; }
export function resetAll(t: Tally): number { reset.call(t); return t.n + t.last + t.meta.hits; }
