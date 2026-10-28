// a free function writes its declared receiver: the write rebuilds the receiver record, and a caller passing a local
// record through call or apply takes the new value back, in a loop and in a loop callback too
type Tally = { n: number; last: number; meta: { hits: number } };
function add(this: Tally, k: number): number { this.n = this.n + k; this.last = k; this.meta.hits++; return this.n; }
export function sumAll(xs: number[]): number {
  const t: Tally = { n: 0, last: 0, meta: { hits: 0 } };
  for (const x of xs) { add.call(t, x); }
  return t.n * 100 + t.last * 10 + t.meta.hits;
}
export function twice(a: number, b: number): number {
  const t: Tally = { n: a, last: 0, meta: { hits: 0 } };
  const first = add.apply(t, [b]);
  add.call(t, first);
  return t.n * 10 + t.meta.hits;
}
export function eachAdd(xs: number[]): number {
  const t: Tally = { n: 1, last: 0, meta: { hits: 0 } };
  xs.forEach((x) => { add.call(t, x); });
  return t.n * 10 + t.meta.hits;
}
