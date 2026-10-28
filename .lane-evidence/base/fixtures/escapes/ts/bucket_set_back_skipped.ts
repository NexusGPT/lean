// expect: alias-mutation
// `s` is the Set the Map holds at k when k is present; the `continue` skips the set-back, so the change through `s`
// would reach the Map in the program and not in a reading that writes the copy back only at `m.set(k, s)`
export function tally(keys: string[]): number {
  const m = new Map<string, Set<number>>();
  for (const k of keys) {
    const s = m.get(k) ?? new Set<number>();
    s.add(k.length);
    if (k.length > 3) continue;
    m.set(k, s);
  }
  return m.size;
}
