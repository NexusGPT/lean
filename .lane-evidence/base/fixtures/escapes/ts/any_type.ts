// expect: opaque-mutation
export function grow(x: any): number {
  x.push(1);
  return x.length;
}
