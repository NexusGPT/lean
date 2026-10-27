// special numbers: NaN and the infinities are numbers a declared `number` admits; lane B draws them
export type H = { position: number; priceCents: number | null };
// a missing price sorts as an infinite one: a null against Infinity (or NaN) compares as equal and keeps its place
export function order(hits: H[]): H[] {
  return [...hits].sort((a, b) => a.position - b.position || (a.priceCents ?? Number.POSITIVE_INFINITY) - (b.priceCents ?? Number.POSITIVE_INFINITY));
}
// NaN fails both comparisons and clamps to 0
export function clamp(x: number): number {
  return x > 0 ? (x < 100 ? x : 100) : 0;
}
export function total(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}
export function untouched(x: number): number {
  return x * 2 + 1;
}
