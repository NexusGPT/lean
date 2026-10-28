// expect: unsupported-call
// matchAll starts at a named pattern's lastIndex, which another call may have moved
export function count(s: string, re: RegExp): number {
  let n = 0;
  for (const m of s.matchAll(re)) n += m.length;
  return n;
}
