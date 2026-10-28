// Callbacks that throw: a throwing callee inside an array callback ends the loop at the first throwing element with the
// loop's partial state, and a throwing callee inside a promise handler rejects the promise the link returns.
interface Service { get(id: number): Promise<number>; }

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
