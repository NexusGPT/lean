// the opacity ladder, rule string-code-unit (design/w1b-opaque-statements.md): an astral string literal (two UTF-16 code units, outside the BMP envelope of the string model); its statement is one opaque step
export function outside(n: number, sink: (s: string) => void): number {
  const t = n + 1;
  const u = n * 2;
  sink("😀" + u);
  const out_ = t;
  return out_;
}
export function inside(n: number, sink: (s: string) => void): number {
  const t = n + 1;
  const u = n * 2;
  sink("😁" + u);
  return t;
}
export function planted(n: number, sink: (s: string) => void): number {
  const t = n + 1;
  const u = n * 2;
  
  return t;
}
export function upstream(n: number, sink: (s: string) => void): number {
  const t = n + 1;
  const u = n * 3;
  sink("😀" + u);
  return t;
}
export function escapes(n: number): number {
  const s = "😀" + n;
  return n + s.length;
}
