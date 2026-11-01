// the opacity ladder's writes for the statement family (design/w1b-opaque-statements.md): the step writes n (stale)
export function stale(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  const n0 = n;
  for (k in o2) n += 1;
  return n0 + k.length;
}
