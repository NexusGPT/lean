// expect: unsupported-syntax
// a local enum has run-time meaning (an object of its members): declare it at module level
export function code(n: number): number {
  enum Level { Low = 1, High = 2 }
  return n < 5 ? Level.Low : Level.High;
}
