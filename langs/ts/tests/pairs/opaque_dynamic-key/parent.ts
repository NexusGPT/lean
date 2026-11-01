// The opacity ladder (design/w1c-opaque-calls.md), rule `dynamic-key`: a computed key on a record that holds a method. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.
type Rec = { a: number; b: number; run(): number };

export function outside_key(r: Rec, k: keyof Rec): number {
  const n = r.a + 1;
  const v = typeof r[k] === 'number' ? 1 : 0;
  return n + v;
}

export function inside_key(r: Rec, k: keyof Rec): number {
  const n = r.a + 1;
  const v = typeof r[k] === 'number' ? 1 : 0;
  return n + v;
}

export function read_key(r: Rec, k: keyof Rec, x: number): number {
  const y = x + 1;
  const v = typeof r[k] === 'number' ? y : 0;
  return v;
}

export function planted_key(r: Rec, k: keyof Rec): number {
  const v = typeof r[k] === 'number' ? 1 : 0;
  return v;
}
