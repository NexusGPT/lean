// The opacity ladder (design/w1c-opaque-calls.md), rule `assign-target`: `Object.assign` into a record the unit was handed. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_assign(u: { a: number }, p: { a: number; tag: string }): number {
  const n = u.a + 1;
  Object.assign(u, p);
  return n * 2;
}

export function inside_assign(u: { a: number }, p: { a: number; tag: string }, q: { a: number }): number {
  const n = u.a + 1;
  Object.assign(u, p);
  return n * 2;
}

export function read_assign(u: { a: number }, p: { a: number; tag: string }, q: { a: number }, f: boolean): number {
  const s = f ? p : q;
  Object.assign(u, s);
  return u.a;
}

export function write_assign(u: { inner: { a: number } }, p: { a: number; tag: string }): number {
  const n = u.inner.a;
  const t = u.inner;
  Object.assign(t, p);
  return u.inner.a;
}

export function planted_assign(u: { a: number }, p: { a: number; tag: string }): number {
  Object.assign(u, p);
  return u.a;
}
