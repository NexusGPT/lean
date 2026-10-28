export type Node = { readonly v: number; readonly kids: readonly Node[] };
export function total(n: Node): number {
  let t = n.v;
  for (const k of n.kids) t = t + total(k);
  return t;
}
export function depth(n: Node): number {
  let d = 0;
  for (const k of n.kids) { const x = depth(k) + 1; if (x > d) d = x; }
  return d;
}
