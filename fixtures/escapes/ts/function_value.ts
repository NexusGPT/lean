// expect: function-value
export function apply(x: number): number {
  const fs = [(y: number): number => y + 1];
  return fs.length + x;
}
