// the opacity ladder, rule for-in (design/w1b-opaque-statements.md): a for-in whose binding is an outer `let`; its statement is one opaque step
export function outside(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  const out_ = n + k.length;
  return out_;
}
export function inside(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 3;
  return n + k.length;
}
export function planted(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += 2;
  return n + k.length;
}
export function upstream(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1, cc: 2 };
  let k = "";
  let n = 0;
  for (k in o2) n += 1;
  return n + k.length;
}
