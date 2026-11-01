// The opacity ladder (design/w1c-opaque-calls.md), rule `exception-binding`: a try local shadowing a binding its finally reads. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_eb(x: number): number {
  let y = x;
  try { const y = 1; if (x > 0) return y; } finally { y += 1; }
  return y * 2;
}

export function inside_eb(x: number): number {
  let y = x;
  try { const y = 1; if (x > 0) return y; } finally { y += 1; }
  return y;
}

export function read_eb(x: number): number {
  let y = x + 1;
  try { const y = 1; if (x > 0) return y; } finally { y += 1; }
  return y;
}

export function planted_eb(x: number): number {
  let y = x;
  try { const y = 1; if (x > 0) return y; } finally { y += 1; }
  return y;
}
