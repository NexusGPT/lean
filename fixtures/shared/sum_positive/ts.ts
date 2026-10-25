export function sumPositive(xs: readonly number[]): number {
  let total = 0;
  for (const x of xs) {
    if (x > 0) total = total + x;
  }
  return total;
}
