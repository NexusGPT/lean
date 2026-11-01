// the opacity ladder, rule assignment-expression (design/w1b-opaque-statements.md): a logical assignment used as a value; its statement is one opaque step
export function outside(x: number | undefined, y: number): number {
  let z = x;
  const v = y + 1;
  const w = (z ??= v * 2);
  const out_ = w;
  return out_;
}
export function inside(x: number | undefined, y: number): number {
  let z = x;
  const v = y + 1;
  const w = (z ||= v * 2);
  return w;
}
export function planted(x: number | undefined, y: number): number {
  let z = x;
  const v = y + 1;
  const w = (z ??= v + 2);
  return w;
}
export function upstream(x: number | undefined, y: number): number {
  let z = x;
  const v = y + 2;
  const w = (z ??= v * 2);
  return w;
}
