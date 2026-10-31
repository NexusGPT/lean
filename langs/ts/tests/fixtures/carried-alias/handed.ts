export interface Ledger { record(amount: number): void; balance(): number }
export class Box { total = 0; }
export function handed(b: Box, l: Ledger, xs: number[]): number {
  const h = b;
  h.total = 1;
  for (const x of xs) { l.record(x); }
  keep(h);
  return b.total;
}
export function keep(x: Box): void { x.total = 2; }
