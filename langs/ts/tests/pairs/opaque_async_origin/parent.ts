// opaque_async_origin (amendment A2): a step's writes are closed under the alias origin. `fill(t, k)` is an async unit
// called without await (rule `async`): one opaque step. Its outside call `st.tag` may change the array it is handed
// before fill's first await returns. It is handed `t`, an alias of `user.tags`; the step may change
// what `t` names, so it writes `t` AND `user` (count), and `u`, another name for `user` (share). The candidates read the
// length before the step: equal only if the step changes nothing, so neither may be PASS-proved. With
// LEAN_BREAK=async-drop-origins the writes are the references the step mentions alone and both prove (falsely).
// bump: the step rebinds `k` itself (`k++` in its argument); the parent returns k after it, the candidate the value
// before it; under the break k is not written and bump proves (falsely). branch: the step sits in an if; the names it
// writes leave the branch with it, so user after the if is the value after the step; under LEAN_BREAK=async-drop-carry
// the branch drops them and branch proves (falsely).
export interface Store { tag(xs: number[], k: number): Promise<void>; }
export async function fill(st: Store, xs: number[], k: number): Promise<void> {
  await st.tag(xs, k);
}
export function count(st: Store, user: { tags: number[] }, k: number): number {
  const t = user.tags;
  fill(st, t, k);
  return user.tags.length;
}
export function share(st: Store, user: { tags: number[] }, k: number): number {
  const u = user;
  fill(st, user.tags, k);
  return u.tags.length;
}
export function bump(st: Store, user: { tags: number[] }, n: number): number {
  let k = n;
  const j = n;
  fill(st, user.tags, k++);
  return k;
}
export function branch(st: Store, user: { tags: number[] }, k: number): number {
  if (k > 0) {
    fill(st, user.tags, k);
  }
  return user.tags.length;
}
// tick: the same step on both sides, `k++` in its argument; the candidate returns k through a local. A number-bearing
// unit whose only number update sits inside the step: placed (no reason inside a step, translate.mjs site-steps), so
// PASS-proved; under LEAN_BREAK=faithful-steps the rewrite reads the step's `k++` as an update whose value is used
export function tick(st: Store, user: { tags: number[] }, n: number): number {
  let k = n;
  fill(st, user.tags, k++);
  return k;
}
