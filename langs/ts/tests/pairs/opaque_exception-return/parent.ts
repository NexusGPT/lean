// The opacity ladder (design/w1c-opaque-calls.md), rule `exception-return`: a returned alias its finally changes. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_er(xs: number[], x: number): number {
  const n = x + 1;
  const r = ((): number[] => { try { return xs; } finally { xs.push(n); } })();
  return r.length + n * 2;
}

export function inside_er(xs: number[]): number[] {
  try { return xs; } finally { xs.push(1); }
}

export function planted_er(xs: number[]): number[] {
  try { return xs; } finally { xs.push(1); }
}
