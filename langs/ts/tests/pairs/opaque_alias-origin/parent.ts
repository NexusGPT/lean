// The opacity ladder (design/w1c-opaque-calls.md), amendment A2: the writes of an opaque step are closed under the alias
// origin. `t` aliases `user.tags`; the step (a computed callee, rule unsupported-call) may change the array through `t`,
// so it writes `user` too. The candidate reads `user.tags.length` before the alias and returns it: with `user` among the
// step's writes the two sides read two different values and the pair is not proved; dropping it (LEAN_BREAK=
// opaque-calls-drop-write) would make it a false PASS-proved, which the break row refuses.

export function count(user: { tags: number[] }, k: number, m: "push" | "unshift"): number {
  const t = user.tags;
  if (k === 7919) t[m](k);
  return user.tags.length;
}
