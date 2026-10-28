// how many times n can be halved before it reaches 1
export function halvings(n: number): number {
  let steps = 0;
  let m = n;
  while (m > 1) {
    m = Math.floor(m / 2);
    steps += 1;
  }
  const result = steps;
  return result;
}
