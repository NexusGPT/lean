// the opacity ladder, rule param-form (design/w1b-opaque-statements.md): a rest parameter of a nested function (a declaration binds a function value, which no step can output: its unit is read whole); its statement is one opaque step
export function same(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(1, 2);
}
export function escapes(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(2, 1);
}
export function caller(k: number): number {
  const v = escapes(k);
  return 1 + v;
}
