export function countDown(n: number): number {
  let i = n;
  let steps = 0;
  // @decreases i
  while (i > 0) {
    i = i - 1;
    steps = steps + 1;
  }
  return steps;
}
