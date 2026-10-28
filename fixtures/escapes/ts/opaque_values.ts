// expect: non-null-assertion
// `x!` on a value that may be absent is read as the option's payload only where lean tests the option before the
// statement holding it (a return, a declaration, an expression statement or an if condition of the function itself).
// Inside a loop the test would have to run at every turn, so the assertion is refused: test the value or default it.
export function total(xs: number[], bonus?: number): number {
  let sum = 0;
  for (const x of xs) {
    sum += x + bonus!;
  }
  return sum;
}
