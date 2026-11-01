// the opacity ladder, rule record-rest (design/w1b-opaque-statements.md): a rest pattern of a dictionary has no datatype of remaining fields; its statement is one opaque step
export function outside(m: Record<string, number>, x: number): number {
  const d: Record<string, number> = { ...m, q: x + 1 };
  const { q, ...rest } = d;
  return Object.keys(rest).length + q;
}
export function inside(m: Record<string, number>, x: number): number {
  const d: Record<string, number> = { ...m, q: x + 1 };
  const { q, ...rest } = d;
  return Object.keys(rest).length + q;
}
export function planted(m: Record<string, number>, x: number): number {
  const d: Record<string, number> = { ...m, q: x + 1 };
  const { q, ...rest } = d;
  return Object.keys(rest).length + q;
}
export function upstream(m: Record<string, number>, x: number): number {
  const d: Record<string, number> = { ...m, q: x + 1 };
  const { q, ...rest } = d;
  return Object.keys(rest).length + q;
}
