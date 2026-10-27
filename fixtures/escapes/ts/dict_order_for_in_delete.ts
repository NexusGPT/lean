// expect: for-in-delete
// A for-in skips a key deleted before its visit (ECMA-262 14.7.5.9), while the reading visits the keys the object held
// when the loop started; delete only the current key inside the loop, or delete after it.
export function visit(d: Record<string, number>): string {
  const out: string[] = [];
  for (const k in d) {
    delete d['b'];
    out.push(k);
  }
  return out.join(',');
}
