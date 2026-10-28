// map-bucket: a bucket read from the function's own Map and grown in place becomes one set of a new bucket; a Map
// handed in is listed
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

export function into(words: string[], m: Map<string, string[]>): number {
  for (const w of words) {
    const bucket = m.get(w);
    if (bucket) bucket.push(w);
    else m.set(w, [w]);
  }
  return m.size;
}
