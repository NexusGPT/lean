// the opacity ladder, rule collection-iterator (design/w1b-opaque-statements.md): a Map iterator passed on: its first read uses it up; its statement is one opaque step
export function outside(m: Map<string, number>, k: number, sink: (it: Iterable<string>, n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(m.keys(), u + 1);
  return t;
}
export function inside(m: Map<string, number>, k: number, sink: (it: Iterable<string>, n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(m.keys(), u + 1);
  return t;
}
export function planted(m: Map<string, number>, k: number, sink: (it: Iterable<string>, n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(m.keys(), u + 1);
  return t;
}
export function upstream(m: Map<string, number>, k: number, sink: (it: Iterable<string>, n: number) => void): number {
  const t = k + 1;
  const u = k * 2;
  sink(m.keys(), u + 1);
  return t;
}
export function escapes(m: Map<string, number>, k: number): number {
  const it = m.keys();
  return [...it].length + k;
}
