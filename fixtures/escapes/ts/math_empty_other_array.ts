// expect: math-empty
// the test names another array than the one spread: nothing says the spread list is nonempty
export function top(xs: number[], ys: number[]): number {
  return ys.length > 0 ? Math.max(...xs) : 0;
}
