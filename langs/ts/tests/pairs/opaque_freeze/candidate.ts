// The opacity ladder (design/w1c-opaque-calls.md), rule `freeze`: `Object.freeze` of a record the unit was handed. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_freeze(c: { a: number }): number {
  const n = c.a;
  Object.freeze(c);
  return 1 + n;
}

export function inside_freeze(c: { a: number }, d: { a: number }): number {
  const n = c.a;
  Object.freeze(d);
  return n + 1;
}

export function read_freeze(c: { a: number }, d: { a: number }, f: boolean): number {
  const t = f ? d : c;
  Object.freeze(t);
  return 1;
}

export function planted_freeze(c: { a: number }): number {
    c.a = 2;
  return c.a;
}
