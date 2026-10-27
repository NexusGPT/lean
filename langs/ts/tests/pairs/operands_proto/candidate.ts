// Explicit operands: `Object.create(null)` typed as a dictionary is an empty dictionary; other prototype writes stay refused.
export function tally(words: string[]): number {
  const seen: Record<string, number> = {};
  for (const w of words) seen[w] = (seen[w] ?? 0) + 1;
  let n = 0;
  for (const w of words) if (seen[w] === 1) n = n + 1;
  return n;
}
