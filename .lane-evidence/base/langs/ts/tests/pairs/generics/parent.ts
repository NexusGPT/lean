// generic functions: a type parameter is a value compared by equality only
export function firstOr<T>(xs: readonly T[], fallback: T): T {
  return xs.length === 0 ? fallback : xs[0];
}
export function countOf<T>(xs: readonly T[], x: T): number {
  let n = 0;
  for (const y of xs) if (y === x) n = n + 1;
  return n;
}
export function labels(xs: readonly string[]): string {
  return firstOr(xs, "none") + ":" + countOf(xs, "a");
}
