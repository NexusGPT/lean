// expect: assignment-expression
export function logicalValue(n: number | undefined): number {
  let x = n;
  return (x ??= 1);
}
