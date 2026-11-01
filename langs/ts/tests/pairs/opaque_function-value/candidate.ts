// The opacity ladder (design/w1c-opaque-calls.md), rule `function-value`: a callback passed to a same-file function. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.
function twice(f: (y: number) => number, x: number): number { return f(f(x)); }

export function outside_fv(x: number): number {
  const z = x * 2;
  const w = twice((y) => y + 1, z);
  return z + w;
}

export function inside_fv(x: number): number {
  const z = x * 2;
  const w = twice((y) => y + 2, z);
  return w + z;
}

export function read_fv(x: number): number {
  const z = x * 3;
  const w = twice((y) => y + 1, z);
  return w;
}


export function planted_fv(x: number): number {
  const w = twice((y) => y + 3, x);
  return w;
}
