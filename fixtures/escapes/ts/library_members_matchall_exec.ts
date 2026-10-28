// expect: unsupported-call
// the pattern is a const g pattern, but another unit of the file runs exec on it, which moves lastIndex
const WORD = /[a-z]+/g;
export function first(s: string): string | undefined {
  const m = WORD.exec(s);
  return m ? m[0] : undefined;
}
export function all(s: string): number {
  let n = 0;
  for (const m of s.matchAll(WORD)) n += m[0].length;
  return n;
}
