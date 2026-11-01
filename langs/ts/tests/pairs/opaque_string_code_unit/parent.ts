// the opacity ladder, rule string-code-unit (design/w1b-opaque-statements.md): an astral string literal (two UTF-16 code units, outside the BMP envelope of the string model); its statement is one opaque step
declare const out: { sink(v: unknown): void; sinkIt(n: number, it: Iterable<string>): void };
export function outside(n: number): number {
  const t = n + 1;
  const u = n * 2;
  out.sink("😀" + u);
  return t;
}
export function inside(n: number): number {
  const t = n + 1;
  const u = n * 2;
  out.sink("😀" + u);
  return t;
}
export function planted(n: number): number {
  const t = n + 1;
  const u = n * 2;
  out.sink("😀" + u);
  return t;
}
export function upstream(n: number): number {
  const t = n + 1;
  const u = n * 2;
  out.sink("😀" + u);
  return t;
}
export function escapes(n: number): number {
  const s = "😀" + n;
  return s.length + n;
}
