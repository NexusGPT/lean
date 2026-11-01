// another function reads the carried local while the loop runs: the reduce would show it the value before the loop
export function runningTotals(xs: number[]): number[] {
  let total = 0;
  const seen: number[] = [];
  const note = (): void => { seen.push(total); };
  xs.forEach((x) => {
    total += x;
    note();
  });
  return seen;
}
