export interface Ledger { record(amount: number): void; balance(): number }
export class Box { total = 0; }
export function rebound(b: Box, l: Ledger, xs: number[]): number {
  const h = b;
  for (const x of xs) { l.record(x); }
  b = new Box();
  h.total = 1;
  return b.total;
}
