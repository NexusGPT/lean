// the statement reads the step's target before the step: hoisting it first would change that read
type Box = { n: number };
export function pairOf(c: Box): number[] {
  const a = [c.n, c.n || (c.n = 5)];
  return a;
}
