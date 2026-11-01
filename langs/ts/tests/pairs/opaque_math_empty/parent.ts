// the opacity ladder, rule math-empty (design/w1b-opaque-statements.md): `Math.max` of a list that may be empty (-Infinity); its statement is one opaque step
declare const out: { sink(v: unknown): void; sinkIt(n: number, it: Iterable<string>): void };
export function outside(xs: number[], k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sink(u + Math.max(...xs));
  return t;
}
export function inside(xs: number[], k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sink(u + Math.max(...xs));
  return t;
}
export function planted(xs: number[], k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sink(u + Math.max(...xs));
  return t;
}
export function upstream(xs: number[], k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sink(u + Math.max(...xs));
  return t;
}
export function escapes(xs: number[], k: number): number {
  const m = Math.max(...xs);
  return m + k;
}
