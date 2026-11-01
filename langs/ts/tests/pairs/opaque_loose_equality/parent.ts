// the opacity ladder, rule loose-equality (design/w1b-opaque-statements.md): `k == b` between a number and a record-or-number follows ECMA-262 IsLooselyEqual (7.2.14), which the model does not read; its statement is one opaque step
export function outside(a: number, b: { n: number } | number): number {
  const k = a + 1;
  let r = 0;
  if (k == b) r = 1;
  return r;
}
export function inside(a: number, b: { n: number } | number): number {
  const k = a + 1;
  let r = 0;
  if (k == b) r = 1;
  return r;
}
export function planted(a: number, b: { n: number } | number): number {
  const k = a + 1;
  let r = 0;
  if (k == b) r = 1;
  return r;
}
export function upstream(a: number, b: { n: number } | number): number {
  const k = a + 1;
  let r = 0;
  if (k == b) r = 1;
  return r;
}
