// the opacity ladder, rule math-empty (design/w1b-opaque-statements.md): `Math.max` of a list that may be empty (-Infinity); its statement is one opaque step
export function outside(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const ys = xs.map((x) => x + 1);
  sink(Math.max(...ys));
  return t;
}
export function inside(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const ys = xs.map((x) => x + 1);
  sink(Math.max(...ys));
  return t;
}
export function planted(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const ys = xs.map((x) => x + 1);
  sink(Math.max(...ys));
  return t;
}
export function upstream(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const ys = xs.map((x) => x + 1);
  sink(Math.max(...ys));
  return t;
}
export function escapes(xs: number[], k: number): number {
  const m = Math.max(...xs);
  return m + k;
}
