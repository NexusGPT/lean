// the opacity ladder, rule collection-iterator (design/w1b-opaque-statements.md): a Map iterator passed on: its first read uses it up; its statement is one opaque step
declare const out: { sink(v: unknown): void; sinkIt(n: number, it: Iterable<string>): void };
export function outside(m: Map<string, number>, k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sinkIt(u + 1, m.keys());
  const out_ = t;
  return out_;
}
export function inside(m: Map<string, number>, k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sinkIt(u * 3, m.keys());
  return t;
}
export function planted(m: Map<string, number>, k: number): number {
  const t = k + 1;
  const u = k * 2;
  out.sinkIt(u - 1, m.keys());
  return t;
}
export function upstream(m: Map<string, number>, k: number): number {
  const t = k + 1;
  const u = k * 3;
  out.sinkIt(u + 1, m.keys());
  return t;
}
export function escapes(m: Map<string, number>, k: number): number {
  const it = m.keys();
  return k + [...it].length;
}
