// the opacity ladder, rule param-form (design/w1b-opaque-statements.md): a rest parameter of a nested function; its statement is one opaque step
export function outside(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(1, 2);
}
export function inside(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(1, 2);
}
export function planted(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(1, 2);
}
export function upstream(k: number): number {
  const m = k + 1;
  function inner(...ys: number[]) { return ys.length + m; }
  return inner(1, 2);
}
