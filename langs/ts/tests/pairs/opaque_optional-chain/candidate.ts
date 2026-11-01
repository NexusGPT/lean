// The opacity ladder (design/w1c-opaque-calls.md), rule `optional-chain`: an optional call of a function field of a class instance. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.
class Box { cb?: (x: number) => number; }

export function outside_oc(b: Box, x: number): number {
  const t = x + 1;
  const r = b.cb?.(t) ?? 0;
  return r + 2 * t;
}

export function inside_oc(b: Box, x: number): number {
  const t = x + 1;
  const r = b.cb?.(t) ?? 1;
  return r + t;
}

export function read_oc(b: Box, x: number): number {
  const t = x + 2;
  const r = b.cb?.(t) ?? 0;
  return r;
}

export function planted_oc(b: Box, x: number): number {
  const r = b.cb?.(x) ?? 6;
  return r;
}
