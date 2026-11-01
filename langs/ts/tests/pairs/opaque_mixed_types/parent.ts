// the opacity ladder, rule mixed-types (design/w1b-opaque-statements.md): `===` between a primitive-or-record union and a value that is not a literal; its statement is one opaque step
export function outside(x: number | { o: number }, y: number): boolean {
  const t = y + 1;
  const same = t === x;
  return same;
}
export function inside(x: number | { o: number }, y: number): boolean {
  const t = y + 1;
  const same = t === x;
  return same;
}
export function planted(x: number | { o: number }, y: number): boolean {
  const t = y + 1;
  const same = t === x;
  return same;
}
export function upstream(x: number | { o: number }, y: number): boolean {
  const t = y + 1;
  const same = t === x;
  return same;
}
