// a counted loop that steps by two, and one that counts down
export function sumEvenIndices(xs: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < xs.length; i += 2) total = total + xs[i];
  return total;
}
export function countDown(n: number): number {
  let acc = 0;
  for (let i = n; i > 0; i--) acc = acc + i;
  return acc;
}
