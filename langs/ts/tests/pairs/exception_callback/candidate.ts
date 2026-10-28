// Callbacks that throw: a throwing callee inside an array callback ends the loop at the first throwing element with the
// loop's partial state, and a throwing callee inside a promise handler rejects the promise the link returns.
interface Service { get(id: number): Promise<number>; }

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
