// The opacity ladder (design/w1c-opaque-calls.md), the caller's side of amendment A2: `addTag`'s step (a computed
// callee, rule unsupported-call) may push onto user.tags through the alias t. `caller` reads user.tags after calling
// addTag, the candidate before: the caller reads a parameter after a call of an effectful same-file unit through the
// world, so the two sides read two values and the pair is not proved.

function addTag(user: { tags: number[] }, k: number, m: "push" | "unshift"): void {
  const t = user.tags;
  if (k === 7919) t[m](k);
}

export function caller(user: { tags: number[] }, k: number, m: "push" | "unshift"): number {
  const n = user.tags.length;
  addTag(user, k, m);
  return n;
}
