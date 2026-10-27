// Lane lint-misfires: readings run in Node and in Dafny on the same inputs (the differential step). A block's own
// declarations end with the block; a local procedure's parameter may share a name with the unit; a defaulted parameter
// takes its default when the call leaves it out; a push through a Map the unit built changes the Map; an alias rebound
// to a fresh array is that array; Math.max over a guarded spread.
export function blockScope(n: number, ks: number[]): number {
  const x = n;
  let t = 0;
  for (const k of ks) {
    { const x = k * 10; t = t + x; }
    t = t + x;
  }
  { const x = 1000; t = t + x; }
  return t + x;
}
export function scopedJumps(n: number, ks: number[]): number {
  const x = n;
  let t = 0;
  for (const k of ks) {
    if (k > 0) { const x = 100; t = t + x; continue; }
    switch (k) { case 0: { const x = 7; t = t + x; break; } default: break; }
    t = t + x;
  }
  ks.forEach((k) => { if (k > 1) { const x = 1000; t = t + x; return; } t = t + x; });
  return t;
}
export function shadowProc(words: string[], list: string[]): number {
  let out = 0;
  const add = (list: string[], weight = 1) => { for (const w of list) out = out + w.length * weight; };
  add(words);
  add(list, 100);
  return out + list.length;
}
export function shifted(xs: number[], k: number): number {
  let acc = 0;
  const add = (k: number): void => { acc = acc + k; };
  for (const x of xs) add(x);
  return acc + k;
}
export function buckets(keys: string[]): number {
  const direct = new Map<string, number[]>();
  const guarded = new Map<string, number[]>();
  const coalesced = new Map<string, number[]>();
  for (const k of keys) {
    const v = k.length;
    if (!direct.has(k)) direct.set(k, [0]);
    direct.get(k)?.push(v);
    const g = guarded.get(k);
    if (g) g.push(v * 2);
    else guarded.set(k, [v]);
    const c = coalesced.get(k) ?? [7];
    c.push(v + 1);
    coalesced.set(k, c);
  }
  let total = 0;
  for (const k of keys) {
    const a = direct.get(k);
    const b = guarded.get(k);
    const c = coalesced.get(k);
    if (a) for (const x of a) total = total + 1000 + x;
    if (b) for (const x of b) total = total + 100 + x;
    if (c) for (const x of c) total = total + 10 + x;
  }
  return total;
}
export function rebound(merged: number[], g: boolean): number {
  let flat = merged;
  if (g) {
    flat = [];
    for (const h of merged) flat.push(h + 1);
  }
  let sum = 0;
  for (const x of flat) sum = sum + x;
  return flat.length * 100 + sum + merged.length;
}
export function widest(xs: number[]): number {
  const a = xs.length ? Math.max(...xs.map((x) => x * 2)) : 0;
  const b = xs.length > 0 ? Math.min(...xs) - 3 : 0;
  const c = !xs.length ? 0 : Math.max(...xs);
  if (xs.length === 0) return a + b + c;
  return a + b + c + Math.max(...xs);
}
