// expect: alias-mutation
// `m.get(k) ?? []` holds the array the Map holds at k when k is present: a push through it changes the caller's Map,
// which a copy reading would miss (this form was inside the subset and proved equal to the unit without the push)
export function grow(m: Map<string, number[]>, k: string): number {
  const l = m.get(k) ?? [];
  l.push(1);
  const b = m.get(k);
  return b ? b.length : 0;
}
