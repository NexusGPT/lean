export interface Ledger { record(amount: number): void; balance(): number }
export class Box { total = 0; }
export function sumInto(b: Box, l: Ledger, xs: number[]): number {
  const h = b;
  for (const x of xs) {
    l.record(x);
    h.total += x;
  }
  b.total += 1;
  return h.total;
}
