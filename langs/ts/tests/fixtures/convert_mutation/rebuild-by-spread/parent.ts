// an array of the container is held under another name: a rebuild would leave that name on the old array
export function firstGrowth(words: string[]): number {
  const buckets: string[][] = [[], []];
  const first = buckets[0];
  for (const w of words) buckets[0].push(w);
  return first.length;
}
