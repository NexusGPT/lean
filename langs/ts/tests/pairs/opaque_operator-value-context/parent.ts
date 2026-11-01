// The opacity ladder (design/w1c-opaque-calls.md), rule `operator-value-context`: an update inside a short-circuit right operand. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_ovc(flag: boolean, x: number): number {
  let y = x;
  const r = flag && y++ > 0;
  return y + (r ? 1 : 0);
}

export function inside_ovc(flag: boolean, x: number): number {
  let y = x;
  const r = flag && y++ > 0;
  return y + (r ? 1 : 0);
}

export function read_ovc(flag: boolean, x: number): number {
  let y = x + 1;
  const r = flag && y++ > 0;
  return r ? 1 : 0;
}

export function write_ovc(flag: boolean, x: number): number {
  let y = x;
  const old = y;
  const r = flag && y++ > 0;
  return old + (r ? 1 : 0);
}

export function planted_ovc(flag: boolean, x: number): number {
  let y = x;
  const r = flag && y++ > 0;
  return r ? y : 0;
}
