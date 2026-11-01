// rebuild-by-spread: a push into an array a container of this function holds becomes a rebuild of that array
export function slots(group: readonly string[], said: (s: string) => string | undefined): string[] {
  const parts: string[][] = group.map(() => []);
  for (let slot = 0; slot < group.length; slot++) {
    const s = group[slot];
    if (s === undefined) continue;
    const w = said(s);
    if (w !== undefined) parts[slot]?.push(w);
  }
  return parts.map((p) => p.join(', '));
}

export function byLength(words: string[]): number[] {
  const buckets: number[][] = [[], [], []];
  for (const w of words) {
    const k = Math.min(w.length, 2);
    buckets[k].push(w.length);
  }
  return [buckets[0].length, buckets[1].length, buckets[2].length];
}

export function ordered(xs: number[]): number[] {
  return xs.reverse();
}
