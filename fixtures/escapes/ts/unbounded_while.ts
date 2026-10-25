// expect: unbounded-loop
export function spin(n: number): number {
  let i = n;
  while (i > 0) {
    i = i - 1;
  }
  return i;
}
