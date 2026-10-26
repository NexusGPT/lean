// expect: uninitialised
export function later(x: number): number {
  let y: number;
  y = x + 1;
  return y;
}
