// expect: callback-control
// a try inside an array callback: the loop reading has no catch; write the loop as a for-of
export function safe(xs: number[]): number[] {
  return xs.map((x) => { try { return x * 2; } catch { return 0; } });
}
