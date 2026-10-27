// expect: callback-form
/// <reference lib="es2023" />
// findLast passes the index from the end of the scan; the element-only reading does not read it
export function lastEven(xs: number[]): number | undefined {
  return xs.findLast((x, i) => x % 2 === 0 && i > 0);
}
