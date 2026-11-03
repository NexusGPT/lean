// the price of n units at a tier: a tier the table does not name costs nothing
export function cost(tier: string, n: number): number {
  switch (tier) {
    case "gold": return n * 2;
    case "silver": return n;
  }
  return 0;
}
