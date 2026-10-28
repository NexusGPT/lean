export function sumOfPositives(xs: readonly number[]): number {
  const positives = xs.filter((x) => x > 0);
  let total = 0;
  for (const x of positives) {
    total = total + x;
  }
  return total;
}
