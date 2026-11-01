// the opacity ladder, rule math-empty (design/w1b-opaque-statements.md): `Math.max` of a list that may be empty (-Infinity); its statement is one opaque step
export function outside(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(u + Math.max(...xs));
  const out_ = t;
  return out_;
}
export function inside(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(u + Math.min(...xs));
  return t;
}
export function planted(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(u - Math.max(...xs));
  return t;
}
export function upstream(xs: number[], k: number, sink: (n: number) => void): number {
  const t = k + 1;
  const u = k * 3;
  sink(u + Math.max(...xs));
  return t;
}
export function escapes(xs: number[], k: number): number {
  const m = Math.max(...xs);
  return k + m;
}
