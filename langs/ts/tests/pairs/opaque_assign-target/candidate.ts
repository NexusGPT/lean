// The opacity ladder (design/w1c-opaque-calls.md), rule `assign-target`: `Object.assign` into a record the unit was handed. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_assign(u: { a: number }, p: { a: number }): number {
  const n = u.a + 1;
  Object.assign(u, p);
  return 2 * n;
}

export function inside_assign(u: { a: number }, p: { a: number }, q: { a: number }): number {
  const n = u.a + 1;
  Object.assign(u, q);
  return n * 2;
}

export function read_assign(u: { a: number }, p: { a: number }, q: { a: number }, f: boolean): number {
  const s = f ? q : p;
  Object.assign(u, s);
  return u.a;
}

export function write_assign(u: { a: number }, p: { a: number }): number {
  const n = u.a;
  Object.assign(u, p);
  return u.a;
}

export function planted_assign(u: { a: number }, p: { a: number }): number {
    return u.a;
}
