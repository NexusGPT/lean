export interface Ledger { record(amount: number): void; balance(): number }
export class Box { total = 0; }
export function closure(b: Box, l: Ledger, xs: number[]): number {
  const h = b;
  const f = () => b.total;
  for (const x of xs) { l.record(x); }
  h.total = 1;
  return f();
}
