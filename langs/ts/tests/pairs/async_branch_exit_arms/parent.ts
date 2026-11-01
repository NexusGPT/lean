// async_branch_exit_arms: an await in each arm of an if of an async unit, no name written (the shape w1d met in a
// fixture's save). A rejection leaves the unit, so each arm carries what follows; the candidate awaits once on a
// conditional argument, the same in JavaScript, and is PASS-proved. With LEAN_BREAK=async-branch-exit the arms are
// values merged before what follows: an arm's fault exit has type (World, Unit) where the merge expects World, and the
// theorem does not resolve in Dafny (not proved). Its own pair: a file that does not resolve proves none of its lemmas.
export interface Svc { put(n: number): Promise<void>; }
export async function tag(svc: Svc, x: number): Promise<void> {
  if (x === 7919) {
    await svc.put(x + 1);
  } else {
    await svc.put(x);
  }
}
