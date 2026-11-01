// the opacity ladder, rule destructuring (design/w1b-opaque-statements.md): a catch clause that binds a pattern; its statement is one opaque step
export function outside(xs: number[]): number {
  const i = xs.length - 1;
  let n = 0;
  try { n = xs[i] * 2; } catch ({ message }: any) { n = -1; }
  return n;
}
export function inside(xs: number[]): number {
  const i = xs.length - 1;
  let n = 0;
  try { n = xs[i] * 2; } catch ({ message }: any) { n = -1; }
  return n;
}
export function planted(xs: number[]): number {
  const i = xs.length - 1;
  let n = 0;
  try { n = xs[i] * 2; } catch ({ message }: any) { n = -1; }
  return n;
}
export function upstream(xs: number[]): number {
  const i = xs.length - 1;
  let n = 0;
  try { n = xs[i] * 2; } catch ({ message }: any) { n = -1; }
  return n;
}
