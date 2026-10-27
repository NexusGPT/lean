// expect: param-assign
export function firstLength(x: number[]): number {
  x = [];
  x.push(1);
  return x.length;
}
