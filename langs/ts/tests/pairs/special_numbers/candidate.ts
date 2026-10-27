// special numbers: NaN and the infinities are numbers a declared `number` admits; lane B draws them
export type H = { position: number; priceCents: number | null };
// nulls last: a null now sorts after Infinity and after NaN
function orderPrice(x: number | null, y: number | null): number {
  if (x === null) return y === null ? 0 : 1;
  return y === null ? -1 : x - y;
}
export function order(hits: H[]): H[] {
  return [...hits].sort((a, b) => a.position - b.position || orderPrice(a.priceCents, b.priceCents));
}
// equal on every finite number; Math.max(NaN, 0) is NaN, so NaN now comes back
export function clamp(x: number): number {
  return Math.min(Math.max(x, 0), 100);
}
// the compound assignment spelled out: the same additions in the same order, equal on NaN and the infinities too
export function total(xs: number[]): number {
  let s = 0;
  for (const x of xs) {
    s = s + x;
  }
  return s;
}
export function untouched(x: number): number {
  return x * 2 + 1;
}
