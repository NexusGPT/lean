// the opacity ladder's refusals for the statement family (design/w1b-opaque-statements.md): a site whose step would read
// values that are not its state keeps its refusal (identity); A2's pair, whose write's origin is another family's
// (alias_origin, alias_step)
export function alias_origin(user: { tags: number[] }, k: number): number {
  const t = user.tags;
  if (k === 7919) t.push(k);
  return user.tags.length;
}
export function alias_step(user: { tags: number[] }, k: number): number {
  const t = user.tags;
  let key = "";
  for (key in { a: 1 }) if (k === 7919) t.push(k);
  return user.tags.length + key.length;
}
export function identity(x: number | { o: number }, y: number): boolean {
  const t = x;
  const same = x === t;
  return same && y > 0;
}
