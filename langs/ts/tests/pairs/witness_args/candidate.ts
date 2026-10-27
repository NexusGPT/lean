// a witness's args are the input as drawn: each writer below changes its argument, and its candidate writes a
// different value, so lane B's witness must show the argument as it was before the parent's call wrote it
export type Account = { id: string; balance: number };

// a Map argument written: a key added
export function addKey(m: Map<string, number>, k: string): number {
  m.set(k, m.size + 2);
  return m.size;
}

// a record argument's field written
export function deposit(acc: Account, x: number): number {
  acc.balance = acc.balance + x + 1;
  return x;
}

// an array argument pushed
export function pushItem(xs: number[], x: number): number {
  xs.push(x + 1);
  return xs.length;
}

// a pure unit: nothing written, the outcome changes
export function scaled(xs: number[], k: number): number {
  return xs.length + k + 1;
}

// a refactor that keeps behaviour
export function sumBoth(xs: number[], k: number): number {
  const n = xs.length;
  return k + n;
}

// untouched
export function count(xs: number[]): number {
  return xs.length;
}
