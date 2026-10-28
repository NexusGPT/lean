// Callbacks that throw: a throwing callee inside an array callback ends the loop at the first throwing element with the
// loop's partial state, and a throwing callee inside a promise handler rejects the promise the link returns.
interface Service { get(id: number): Promise<number>; }
interface Box { k: number; }

export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}

// a throwing callee inside a map callback
export function scaled(xs: number[], k: number): number[] {
  return xs.map((x) => check(x) * k);
}

// a throwing callee inside a forEach callback that writes a cell; a pure value computed before the loop
export function total(xs: number[], k: number): number {
  const twice = k * 2;
  let s = 0;
  xs.forEach((x) => { s = s + check(x); });
  return s + twice;
}

// a throwing callee inside a then handler
export async function later(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => check(x) + 1);
}

// a throwing callee inside a then handler, a pure value computed before it
export async function ordered(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => { const next = x + 1; const c = check(x); return next + c; });
}

// two throwing callees in one handler: the second never runs after the first throws
export async function guarded(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => { const a = check(x); return check(a - 1); });
}

// a throwing unit called with its receiver through call: the call of the unit, its fault routed as a direct call's
export function times(this: Box, n: number): number {
  if (n < 0) throw new Error("negative");
  return n * this.k;
}
export function viaCall(this: Box, a: number, b: number): number {
  return times.call(this, a) + times.call(this, b);
}

// a throwing unit called through call, its result used
export function callOne(this: Box, a: number): number {
  return times.call(this, a) + 1;
}

// a throwing unit called through call beside a pure value
export function callOrdered(this: Box, a: number, b: number): number {
  const d = a * 2;
  const t = times.call(this, b);
  return d + t;
}

// the loop stops at the first throwing element: a negative a throws before b is checked
export function both(a: number, b: number): number {
  [a, b].forEach((x) => { check(x); });
  return 0;
}

// throws at the second element when b is negative; c is checked only when a and b pass
export function middle(a: number, b: number, c: number): number {
  [a, b, c].forEach((x) => { check(x); });
  return 0;
}
