// map-bucket: a bucket read from the function's own Map and grown in place becomes one set of a new bucket; a Map
// handed in is listed. `groups` is a shape the lint admits (`if (bucket) bucket.push(w)` on the function's own Map), so
// the converter leaves it; `byKey` tests the bucket the other way round, which the lint still refuses.
export function groups(words: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const w of words) {
    const k = w.slice(0, 1);
    const bucket = m.get(k);
    if (bucket) bucket.push(w);
    else m.set(k, [w]);
  }
  return m;
}

export function byKey(words: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const w of words) {
    const k = w.slice(0, 1);
    m.set(k, [...(m.get(k) ?? []), w]);
  }
  return m;
}

export function into(words: string[], m: Map<string, string[]>): number {
  for (const w of words) {
    const bucket = m.get(w);
    if (bucket) bucket.push(w);
    else m.set(w, [w]);
  }
  return m.size;
}
