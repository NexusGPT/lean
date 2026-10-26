// expect: do-while
export function countDown(n: number): number {
  let i = n;
  do { i = i - 1; } while (i > 0);
  return i;
}
