// the opacity ladder, rule unary-coercion (design/w1b-opaque-statements.md): unary + on an object (ToNumber of an object, NaN here); its statement is one opaque step
export function same(o: { v: number }, k: number): number {
  const n = +(o as any);
  return n + k;
}
export function escapes(o: { v: number }, k: number): number {
  const n = +(o as any);
  return n + k;
}
export function caller(o: { v: number }, k: number): number {
  const v = escapes(o, k);
  return v + 1;
}
