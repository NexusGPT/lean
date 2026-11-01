// The opacity ladder (design/w1c-opaque-calls.md), rule `instanceof-constructor`: an `instanceof` against a constructor value. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_inst(x: unknown, pick: () => any, n: number): number {
  const m = n + 1;
  const r = x instanceof pick() ? 1 : 0;
  return m + r;
}

export function inside_inst(x: unknown, pick: () => any, n: number): number {
  const m = n + 1;
  const r = x instanceof pick() ? 1 : 0;
  return m + r;
}

export function read_inst(x: unknown, pick: () => any, n: number): number {
  const m = n + 1;
  const r = x instanceof pick() ? m : 0;
  return r;
}

export function planted_inst(x: unknown, pick: () => any, n: number): number {
  const r = x instanceof pick() ? n : 7;
  return r;
}
