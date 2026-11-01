// The opacity ladder (design/w1c-opaque-calls.md), rule `callback-form`: a callback that is a function expression. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_cbform(xs: number[]): number {
  const k = xs.length;
  const ys = xs.map(function (x) { return x + k; });
  return ys.length + k;
}

export function inside_cbform(xs: number[]): number[] {
  const k = xs.length;
  const ys = xs.map(function (x) { return x + k; });
  return ys;
}

export function read_cbform(xs: number[], j: number): number[] {
  const k = j + 1;
  const ys = xs.map(function (x) { return x + k; });
  return ys;
}

export function planted_cbform(xs: number[]): number[] {
  const ys = xs.map(function (x) { return x * 3; });
  return ys;
}
