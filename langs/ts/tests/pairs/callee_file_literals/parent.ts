// Units that hand a value to a function of another file of the package, which compares it against its own literals
// (tiers.ts cost). Lane B drew the parameter from the unit's own literals and the same-file callees' (exec/usage.mjs),
// so no draw named a tier the table prices and both versions returned 0 on every input.
import { cost } from "./tiers";
import * as tiers from "./tiers";

// the candidate prices one unit more
export function price(tier: string, n: number): number {
  return cost(tier, n);
}

// the same through a namespace import, the tier read off the order
export function priceOf(order: { tier: string; n: number }): number {
  return tiers.cost(order.tier, order.n);
}

// the candidate writes the same call through a local: equal
export function priceRefactor(tier: string, n: number): number {
  return cost(tier, n);
}
