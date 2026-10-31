// the three readings the heap core shares with the ordinary lane (design/heap-stage5.md section 21b), each on a value
// only the core reads: the bitwise reading of a number the model does not hold (a sum over an array), a loop whose
// body never changes the world (here, one inside another) and a for-of loop in a real-number file
export interface Bag { items: number[]; n: number }

export function bits(xs: number[]): number {
  let t = 0;
  for (const x of xs) t += x;
  return t | 0;
}

export function low(xs: number[]): number {
  let t = 0;
  for (const x of xs) t += x;
  return t << 32;
}

export function flip(xs: number[]): number {
  let t = 0;
  for (const x of xs) t += x;
  return t | 0;
}

export function grid(rows: number[][]): number {
  if (rows.length === 0) return 0;
  let total = 0;
  for (const r of rows) for (const x of r) total += x;
  return total / rows.length;
}

export function halve(rows: number[][]): number {
  let total = 0;
  for (const r of rows) for (const x of r) total += x;
  return total / 2;
}

export function field(b: Bag): number {
  let t = 0;
  for (const x of b.items) t += x;
  return b.items.length === 0 ? 0 : t / b.items.length;
}
