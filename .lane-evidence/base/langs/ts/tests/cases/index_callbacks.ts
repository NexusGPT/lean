// callbacks of sequence methods may take the index as their second parameter
export function evens(xs: readonly number[]): readonly number[] {
  return xs.filter((x, i) => i % 2 === 0);
}
export function weighted(xs: readonly number[]): number {
  let total = 0;
  for (const v of xs.map((x, i) => x * (i + 1))) total = total + v;
  return total;
}
export function firstAbove(xs: readonly number[], limit: number): number {
  return xs.findIndex((x, i) => x > limit && i > 0);
}
