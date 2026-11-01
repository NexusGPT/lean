// The opacity ladder (design/w1c-opaque-calls.md), rule `callback-control`: a return from an inner loop inside an array callback. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_cbc(xs: number[], m: number): number {
  const k = m + 1;
  const ys = xs.map((x) => { for (const y of xs) { if (y > x) return y * k; } return x; });
  return k + ys.length;
}

export function inside_cbc(xs: number[], m: number): number[] {
  const k = m + 1;
  const ys = xs.map((x) => { for (const y of xs) { if (y >= x) return y * k; } return x; });
  return ys;
}

export function read_cbc(xs: number[], m: number): number[] {
  const k = m + 2;
  const ys = xs.map((x) => { for (const y of xs) { if (y > x) return y * k; } return x; });
  return ys;
}

export function planted_cbc(xs: number[]): number[] {
  const ys = xs.map((x) => { for (const y of xs) { if (y >= x) return y; } return x; });
  return ys;
}
