// expect: for-in
// for-in binds a fresh const name, not an existing variable
export function countKeys(o: Record<string, number>): number {
  let k: string;
  let n = 0;
  for (k in o) {
    n += 1;
  }
  return n;
}
