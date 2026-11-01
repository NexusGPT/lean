// The opacity ladder (design/w1c-opaque-calls.md), rule `dynamic-key`: a computed key on a record that holds a method (the
// key may name the method, or a name of Object.prototype). The statement holding it is one opaque step keyed by its text,
// reading every name it mentions, writing every name it assigns and every reference in scope; a boundary rule, so every
// name the step may write is read at Any.
type Rec = { a: number; b: number; run(): number };

export function outside_key(k: "a" | "b" | "run", x: number): number {
  const y = x + 1;
  const r: Rec = { a: x, b: 2, run: () => 3 };
  const v = y + (typeof r[k] === "number" ? 1 : 0);
  return v * 2;
}

export function inside_key(k: "a" | "b" | "run", x: number): number {
  const y = x + 1;
  const r: Rec = { a: x, b: 2, run: () => 3 };
  const v = y + (typeof r[k] === "number" ? 1 : 0);
  return v;
}

export function read_key(k: "a" | "b" | "run", x: number): number {
  const y = x + 1;
  const r: Rec = { a: x, b: 2, run: () => 3 };
  const v = y + (typeof r[k] === "number" ? 1 : 0);
  return v;
}

export function planted_key(k: "a" | "b" | "run", x: number): number {
  const y = x + 1;
  const r: Rec = { a: x, b: 2, run: () => 3 };
  const v = y + (typeof r[k] === "number" ? 1 : 0);
  return v;
}
