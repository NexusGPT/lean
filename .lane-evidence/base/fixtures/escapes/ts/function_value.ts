// expect: function-value
function twice(f: (y: number) => number, x: number): number {
  return f(f(x));
}
export function apply(x: number): number {
  return twice((y: number): number => y + 1, x);
}
