// w1d: what work a step leaves pending may touch (opaque-async.mjs pendingWork, design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; }
const queue: (() => void)[] = [];
// refused: the executor writes through a literal into the object `user` names (a deeper path than the literal's own)
export function deep(svc: Svc, user: { n: number }): number {
  new Promise<void>((res) => { const o = { a: user }; o.a.n = 1; res(); });
  return user.n;
}
// graded: the executor writes the field of an object it made itself
export function own(svc: Svc, k: number): number {
  new Promise<void>((res) => { const o = { a: 0 }; o.a = k; res(); });
  return k;
}
// graded: the executor writes into a module cell (a field of the world)
export function cell(n: number): number {
  new Promise<void>((res) => { queue.push(res); });
  return n;
}
// refused: the executor hands `user` to a call, and the unit reads it after the step
export function later(svc: Svc, user: { n: number }, f: (u: { n: number }) => void): number {
  new Promise<void>((res) => { f(user); res(); });
  return user.n;
}
// graded: the same handed name read only before the step
export function before(svc: Svc, user: { n: number }, f: (u: { n: number }) => void): number {
  const m = user.n;
  new Promise<void>((res) => { f(user); res(); });
  return m;
}
