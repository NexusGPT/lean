// the opacity ladder where values are not state, for the statement family (design/w1b-opaque-statements.md): a site whose step would read
// values that are not its state is read in its unit's block (identity); A2's pair, whose write's origin is the
// mutation family's (alias_origin, alias_step)
export function alias_origin(user: { tags: number[] }, k: number): number {
  const n = user.tags.length;
  const t = user.tags;
  if (k === 7919) t.push(k);
  return n;
}
export function alias_step(user: { tags: number[] }, k: number): number {
  const n = user.tags.length;
  const t = user.tags;
  let key = "";
  for (key in { a: 1 }) if (k === 7919) t.push(k);
  return n + key.length;
}
export function identity(x: { o: number }, y: number): boolean {
  const t = { ...x };
  const same = x == t;
  return same && y > 0;
}
