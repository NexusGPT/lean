// async_branch_exit: an await in an async unit leaves the unit when it rejects, also inside an if. Each candidate is the
// parent restated so that the await sits outside the branch (or the branch returns), the same in JavaScript, so every
// unit is PASS-proved. With LEAN_BREAK=async-branch-exit the branches are values merged before what follows again and
// the fault exit is read as a branch's state: tag no longer resolves in Dafny (an arm of type (World, Unit) against
// World), settle reads the fault value as r and adds 1 to it, cond reads a rejected condition as a value; none proves.
export interface Svc { put(n: number): Promise<void>; ok(n: number): Promise<boolean>; }
export async function tag(svc: Svc, x: number): Promise<void> {
  if (x === 7919) {
    await svc.put(x + 1);
  } else {
    await svc.put(x);
  }
}
export async function settle(svc: Svc, k: number): Promise<number> {
  let r = 0;
  if (k > 0) {
    await svc.put(k);
    r = 1;
  }
  return r + 1;
}
export async function cond(svc: Svc, k: number): Promise<number> {
  let r = 0;
  if (await svc.ok(k)) {
    r = 1;
  }
  return r;
}
