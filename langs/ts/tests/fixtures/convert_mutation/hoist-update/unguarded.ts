// the statement reads the step's target before the step: hoisting it first would change that read
type Box = { n: number };
export function pairOf(c: Box): number[] {
  if (!c.n) {
    c.n = 5;
  }
  const a = [c.n, c.n];
  return a;
}
