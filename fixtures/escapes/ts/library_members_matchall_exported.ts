// expect: unsupported-call
// the pattern is exported: code in another file may run exec on it and move lastIndex
export const WORD = /[a-z]+/g;
export function all(s: string): number {
  let n = 0;
  for (const m of s.matchAll(WORD)) n += m[0].length;
  return n;
}
