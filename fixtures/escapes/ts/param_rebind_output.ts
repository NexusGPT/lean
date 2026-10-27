// expect: param-assign
function append(ys: number[]): void {
  ys.push(0);
}
export function grown(xs: number[]): number {
  xs = [...xs];
  append(xs);
  return xs.length;
}
