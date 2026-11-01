// the opacity ladder, rule for-in (design/w1b-opaque-statements.md): a for-in whose binding is an outer `let`; its statement is one opaque step
export function outside(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  return n + k.length;
}
export function inside(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  return n + k.length;
}
export function planted(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  return n + k.length;
}
export function upstream(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  return n + k.length;
}
