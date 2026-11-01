// The opacity ladder (design/w1c-opaque-calls.md), rule `callback-result`: an effectful type-predicate callback. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_cbr(xs: (number | string)[], check: (x: unknown) => boolean, m: number): number {
  const k = m + 1;
  const ys = xs.filter((x): x is number => check(x) && typeof x === 'number');
  return ys.length + k;
}

export function inside_cbr(xs: (number | string)[], check: (x: unknown) => boolean): number {
  const ys = xs.filter((x): x is number => check(x) && typeof x === 'number');
  return ys.length;
}

export function planted_cbr(xs: (number | string)[], check: (x: unknown) => boolean): number {
  const ys = xs.filter((x): x is number => check(x) && typeof x === 'number');
  return ys.length;
}
