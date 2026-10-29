// expect: unsupported-operator
// an assignment operator with no reading
export function bump(x: number): number {
  let y = x;
  y **= 2;
  return y;
}
