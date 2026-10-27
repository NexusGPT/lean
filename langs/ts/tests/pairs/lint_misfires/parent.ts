// Lane lint-misfires: the readings the pyka rewrite needed, and the block-shadowing false proof of the base.
export function blockShadow(n: number): number {
  const x = n;
  { const x = 2; if (x > 5) return 0; }
  return x;
}
export function candidates(words: string[], list: string[]): number {
  const out = new Set<string>();
  const add = (list: string[]) => { for (const w of list) out.add(w); };
  add(words);
  add(list);
  return out.size;
}
export function assignments(cols: string[]): number {
  const sets: string[] = [];
  const params: string[] = [];
  const put = (col: string, value: string, cast = "") => { params.push(value); sets.push(`${col} = $${params.length}${cast}`); };
  put("x", "a");
  put("y", "b", "::int");
  return sets.length + params.length + cols.length;
}
export function widest(xs: number[]): number {
  return xs.length ? Math.max(...xs) : 0;
}
export function bucketCount(keys: string[]): number {
  const m = new Map<string, number[]>();
  for (const k of keys) {
    if (!m.has(k)) m.set(k, []);
    m.get(k)?.push(k.length);
  }
  let total = 0;
  for (const k of keys) {
    const b = m.get(k);
    if (b) total = total + b.length;
  }
  return total;
}
export function rebound(merged: number[], g: boolean): number {
  let flat = merged;
  if (g) {
    flat = [];
    for (const h of merged) flat.push(h + 1);
  }
  return flat.length;
}
export function where(raw: string): number {
  const m = /a(b)$/.exec(raw);
  return m ? m.index : -1;
}
