// a conditional expression reads its condition by its truthiness, then the selected operand only: a same-file call in
// an operand that changes its argument changes it only when its operand is the one selected
export interface Tally { seen: string[]; total: number }

function record(t: Tally, s: string): number {
  t.seen.push(s);
  t.total = t.total + 1;
  return t.total;
}

function wrap(n: number): number {
  return n * 2;
}

// a ternary in a return
export function note(t: Tally, s: string, on: boolean): number {
  return on ? record(t, s) : t.total;
}

// a ternary in a return, the changed argument read after it
export function tally(t: Tally, s: string, on: boolean): number {
  const n = on ? record(t, s) : 0;
  return n + t.seen.length;
}

// a nested ternary, a call in two of its operands
export function route(t: Tally, s: string, k: number): number {
  return k > 10 ? record(t, s + "!") : k > 0 ? record(t, s) : t.total;
}

// a nested ternary with a planted difference
export function stray(t: Tally, s: string, k: number): number {
  const n = k > 10 ? record(t, s + "!") : k > 0 ? record(t, s) : 0;
  return n + t.total;
}

// a ternary as an argument
export function doubled(t: Tally, s: string, on: boolean): number {
  return wrap(on ? record(t, s) : t.total);
}

// a ternary as an argument, the call in the other operand: the planted difference
export function skewed(t: Tally, s: string, on: boolean): number {
  return wrap(on ? t.total : record(t, s)) + t.total;
}

// an operand without a call: untouched
export function plain(t: Tally, on: boolean): number {
  return on ? t.total : t.seen.length;
}
