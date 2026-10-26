// expect: spread
function append(xs: number[]): number { xs.push(1); return xs.length; }
export function conditionalUpdate(xs: number[], on: boolean): number {
  return on ? Math.max(0, ...[append(xs)]) : 0;
}
