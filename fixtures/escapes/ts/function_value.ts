// expect: function-value
export function apply(x: number): number {
  const f = (y: number): number => y + 1;
  return f(x);
}
