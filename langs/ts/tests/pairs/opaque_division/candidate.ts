// the opacity ladder, rule division (design/w1b-opaque-statements.md): compound division in an integer file (a fraction where the model holds an integer); its statement is one opaque step
export function unchanged(x: number): number {
  let y = x;
  y /= 2;
  return y + 1;
}
export function escapes(x: number): number {
  let y = x;
  y /= 2;
  return 1 + y;
}
export function caller(x: number): number {
  const v = escapes(x);
  return 1 + v;
}
