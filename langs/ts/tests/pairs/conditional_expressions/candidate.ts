// a conditional expression reads its condition by its truthiness, then the selected operand only: a same-file call in
// an operand that changes its argument changes it only when its operand is the one selected
export interface Tally { seen: string[]; total: number }
export interface Count { hits: number }

function record(t: Tally, s: string): number {
  t.seen.push(s);
  t.total = t.total + 1;
  return t.total;
}

function wrap(n: number): number {
  return n * 2;
}

// a counter changed through a same-file callee: the units below make their own, so no input is written
function bump(c: Count, by: number): number {
  c.hits = c.hits + by;
  return c.hits;
}

function twice(n: number): number {
  return n + n;
}

// a ternary in a return
export function note(t: Tally, s: string, on: boolean): number {
  if (on) return record(t, s);
  return t.total;
}

// a nested ternary, a call in two of its operands
export function route(t: Tally, s: string, k: number): number {
  if (k > 10) return record(t, s + "!");
  if (k > 0) return record(t, s);
  return t.total;
}

// a nested ternary with a planted difference
export function stray(t: Tally, s: string, k: number): number {
  if (k > 10) return record(t, s + "!");
  return record(t, s);
}

// a ternary as an argument
export function doubled(t: Tally, s: string, on: boolean): number {
  if (on) return wrap(record(t, s));
  return wrap(t.total);
}

// a ternary as an argument, the call in the other operand: the planted difference
export function skewed(t: Tally, s: string, on: boolean): number {
  const n = record(t, s);
  if (on) return wrap(n - 1);
  return wrap(n);
}

// the counter changed in the operand taken is the one read after the conditional
export function tally(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  let n = 0;
  if (on) n = bump(c, by);
  return n + c.hits;
}

// a nested ternary as an argument, the counter changed in two operands
export function ladder(k: number, by: number): number {
  const c: Count = { hits: 1 };
  let m = c.hits;
  if (k > 10) m = bump(c, by);
  else if (k > 0) m = bump(c, 1);
  const n = twice(m);
  return n + c.hits;
}

// a planted difference: the candidate changes the counter on both paths
export function leak(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const b = bump(c, by);
  let n = 0;
  if (on) n = b;
  return n + c.hits;
}

// an operand without a call: untouched
export function plain(t: Tally, on: boolean): number {
  return on ? t.total : t.seen.length;
}
