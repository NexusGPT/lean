// the opacity ladder, rule label (design/w1b-opaque-statements.md): a label on a block, left by `break exit`; its statement is one opaque step
export function outside(x: number): number {
  const g = x + 1;
  let r = 0;
  exit: { if (g > 1) break exit; r = 1; }
  const out_ = r;
  return out_;
}
export function inside(x: number): number {
  const g = x + 1;
  let r = 0;
  exit: { if (g > 1) break exit; r = 2; }
  return r;
}
export function planted(x: number): number {
  const g = x + 1;
  let r = 0;
  exit: { if (!(g > 1)) break exit; r = 1; }
  return r;
}
export function upstream(x: number): number {
  const g = x + 2;
  let r = 0;
  exit: { if (g > 1) break exit; r = 1; }
  return r;
}
