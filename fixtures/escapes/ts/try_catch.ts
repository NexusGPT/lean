// expect: uninitialised
export function later(x: number): number {
  let y;
  y = x + 1;
  return y;
}
