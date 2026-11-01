// The opacity ladder (design/w1c-opaque-calls.md), rule `exception-callback`: a throwing unit stored as a value. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.
function boom(x: number): number { if (x < 0) throw new Error('neg'); return x; }
function bang(x: number): number { if (x > 9) throw new Error('big'); return x; }

export function outside_exc(x: number, k: number): number {
  const n = x + 1;
  const f = k > 0 ? boom : (y: number) => y;
  return 2 * f(n);
}

export function inside_exc(x: number, k: number): number {
  const n = x + 1;
  const f = k > 0 ? bang : (y: number) => y;
  return f(n);
}

export function read_exc(x: number, k: number): number {
  const j = k - 1;
  const f = j > 0 ? boom : (y: number) => y;
  return f(x);
}

export function planted_exc(x: number, k: number): number {
  const f = k >= 0 ? boom : (y: number) => y;
  return f(x);
}
