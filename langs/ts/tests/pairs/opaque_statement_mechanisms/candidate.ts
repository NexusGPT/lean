// the opacity ladder's mechanisms for the statement family (design/w1b-opaque-statements.md): the writes (stale), the
// reached callees in the key (callee, A3), the writes closed under the alias origin (alias_origin, alias_step, A2)
function weight(x: number): number {
  return x === 7919 ? 3 : 1;
}
export function stale(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  const n0 = n;
  for (k in o2) n += 1;
  return n0 + k.length;
}
export function callee(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += weight(x);
  return n + k.length;
}
