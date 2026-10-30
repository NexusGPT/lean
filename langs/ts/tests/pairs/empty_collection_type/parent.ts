// An empty `new Map()` or `new Set()` takes its type from its slot (translate.mjs typeOf, emptyCollectionT)
export type Counts = Map<string, number>;

export function tally(words: readonly string[], key: string): number {
  const counts: Counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts.get(key) ?? 0;
}

export function weighted(words: readonly string[], key: string): number {
  const counts: Counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return words.length > 0 ? counts.get(words[0]) ?? 0 : 0;
}

export function seen(words: readonly string[], key: string): boolean {
  const s: Set<string> = new Set();
  for (const w of words) s.add(w);
  return s.has(key);
}

export function emptyCounts(): Counts {
  return new Map();
}
