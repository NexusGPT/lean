// the opacity ladder, rule number-special (design/w1b-opaque-statements.md): the bare global NaN; its statement is one opaque step
export function unchanged(x: number): number {
  if (x > 0) return NaN;
  return x + 1;
}
export function escapes(x: number): number {
  if (x > 0) return NaN;
  return 1 + x;
}
export function caller(x: number): number {
  const v = escapes(x);
  return 1 + v;
}
