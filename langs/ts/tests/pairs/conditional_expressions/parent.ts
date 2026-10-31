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
  return on ? record(t, s) : t.total;
}

// a nested ternary, a call in two of its operands
export function route(t: Tally, s: string, k: number): number {
  return k > 10 ? record(t, s + "!") : k > 0 ? record(t, s) : t.total;
}

// a nested ternary with a planted difference
export function stray(t: Tally, s: string, k: number): number {
  return k > 10 ? record(t, s + "!") : k > 0 ? record(t, s) : t.total;
}

// a ternary as an argument
export function doubled(t: Tally, s: string, on: boolean): number {
  return wrap(on ? record(t, s) : t.total);
}

// a ternary as an argument, the call in the other operand: the planted difference
export function skewed(t: Tally, s: string, on: boolean): number {
  return wrap(on ? t.total : record(t, s));
}

// the counter changed in the operand taken is the one read after the conditional
export function tally(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const n = on ? bump(c, by) : 0;
  return n + c.hits;
}

// a nested ternary as an argument, the counter changed in two operands
export function ladder(k: number, by: number): number {
  const c: Count = { hits: 1 };
  const n = twice(k > 10 ? bump(c, by) : k > 0 ? bump(c, 1) : c.hits);
  return n + c.hits;
}

// a planted difference: the candidate changes the counter on both paths
export function leak(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const n = on ? bump(c, by) : 0;
  return n + c.hits;
}

// an operand without a call: untouched
export function plain(t: Tally, on: boolean): number {
  return on ? t.total : t.seen.length;
}

// the short-circuit operators are conditionals too: the right operand runs only when the left does not decide

// && in a return: the record changed only when the flag holds
export function noted(t: Tally, s: string, on: boolean): boolean {
  return on && record(t, s) > 1;
}

// && bound to a name: the counter read after it is the one the right operand left
export function gated(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const ok = on && bump(c, by) > 1;
  return (ok ? 10 : 0) + c.hits;
}

// ||: the right operand runs when the left is falsy
export function spare(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const ok = on || bump(c, by) > 1;
  return (ok ? 10 : 0) + c.hits;
}

// || with a planted difference: the candidate changes the counter on both paths
export function slipped(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  const ok = on || bump(c, by) > 1;
  return (ok ? 10 : 0) + c.hits;
}

// ??: the right operand runs when the left is absent
export function fallback(k: number | undefined, by: number): number {
  const c: Count = { hits: 0 };
  const n = k ?? bump(c, by);
  return n + c.hits;
}

export interface Slot { id: string; kind: string; owner: string }

// adds a slot to the list and names it
function attach(xs: Slot[], kind: string, owner: string): string {
  const id = owner + ":" + kind;
  xs.push({ id: id, kind: kind, owner: owner });
  return id;
}

// the found slot's id, or one attached when none is found: the unit's list is changed only when nothing is found
export function anchor(kind: string, owner: string): number {
  const xs: Slot[] = [{ id: owner, kind: "start", owner: owner }];
  const found = xs.find((n) => n.kind === kind && n.owner === owner);
  const id = found?.id ?? attach(xs, kind, owner);
  return id.length + xs.length;
}

// the same with a planted difference: the candidate attaches whatever is found
export function orphan(kind: string, owner: string): number {
  const xs: Slot[] = [{ id: owner, kind: "start", owner: owner }];
  const found = xs.find((n) => n.kind === kind && n.owner === owner);
  const id = found?.id ?? attach(xs, kind, owner);
  return id.length + xs.length;
}

// && as an if's condition: the counter changed only when the flag holds
export function guard(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  if (on && bump(c, by) > 1) return 10 + c.hits;
  return c.hits;
}

// ||=: the right operand runs only when the target is falsy (a logical assignment short-circuits too)
export function lazy(on: boolean, by: number): number {
  const c: Count = { hits: 0 };
  let ok = on;
  ok ||= bump(c, by) > 1;
  return (ok ? 10 : 0) + c.hits;
}

// ?? in a return: the record changed only when the count is absent
export function named(t: Tally, s: string, k: number | undefined): number {
  return k ?? record(t, s);
}
