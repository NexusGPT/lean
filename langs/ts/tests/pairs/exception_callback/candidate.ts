// Callbacks that throw: a throwing callee inside an array callback ends the loop at the first throwing element with the
// loop's partial state, and a throwing callee inside a promise handler rejects the promise the link returns.
interface Service { get(id: number): Promise<number>; }
interface Box { k: number; }

export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}

// changed behaviour: a negative element maps to zero instead of throwing (WITNESS on an array holding a negative)
export function scaled(xs: number[], k: number): number[] {
  return xs.map((x) => (x < 0 ? 0 : check(x)) * k);
}

// a refactor: the pure value moved after the loop; the loop throws at the same element as before
export function total(xs: number[], k: number): number {
  let s = 0;
  xs.forEach((x) => { s = s + check(x); });
  const twice = k * 2;
  return s + twice;
}

// changed behaviour: a negative value resolves to 1 instead of rejecting
export async function later(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => (x < 0 ? 0 : check(x)) + 1);
}

// a refactor: the pure value moved after the throwing call; the handler rejects on the same values
export async function ordered(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => { const c = check(x); const next = x + 1; return next + c; });
}

// a refactor: the first check is implied by the second (x below 0 means x - 1 below 0), so one check rejects alike
export async function guarded(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then((x) => check(x - 1));
}

// a throwing unit called with its receiver through call: the call of the unit, its fault routed as a direct call's
export function times(this: Box, n: number): number {
  if (n < 0) throw new Error("negative");
  return n * this.k;
}
// a refactor: apply with an array literal is the same call
export function viaCall(this: Box, a: number, b: number): number {
  return times.apply(this, [a]) + times.call(this, b);
}

// changed behaviour: a negative a gives 1 instead of throwing (WITNESS)
export function callOne(this: Box, a: number): number {
  return (a < 0 ? 0 : times.call(this, a)) + 1;
}

// a refactor: the pure value moved after the call; the call throws on the same values
export function callOrdered(this: Box, a: number, b: number): number {
  const t = times.call(this, b);
  const d = a * 2;
  return d + t;
}

// changed behaviour: a negative a no longer throws (WITNESS); a loop that ran on after a fault and let the next call
// clear it would read both sides as "throws when b is negative" and could prove them equal
export function both(a: number, b: number): number {
  [0, b].forEach((x) => { check(x); });
  return 0;
}
