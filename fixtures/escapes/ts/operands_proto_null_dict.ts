// expect: prototype
// `Object.create(null)` makes a dictionary without a prototype: `seen['toString']` reads undefined there and a function on `{}`,
// so tally(['toString']) is 1 here and 0 with a literal; the ordinary lane has one map for both and refuses it by name
export function tally(words: string[]): number {
  const seen: Record<string, number> = Object.create(null);
  for (const w of words) seen[w] = (seen[w] ?? 0) + 1;
  let n = 0;
  for (const w of words) if (seen[w] === 1) n = n + 1;
  return n;
}
