// the same count, written with a counter that starts from the other end
export function halvings(n: number): number {
  let steps = 0;
  let m = n;
  while (m >= 2) {
    m = Math.floor(m / 2);
    steps = steps + 1;
  }
  return steps;
}
