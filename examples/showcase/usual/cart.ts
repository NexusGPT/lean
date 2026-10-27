export type Totals = { net: number; lines: number };
export type Cart = { id: string; totals: Totals };

export function addLine(cart: Cart, price: number): number {
  const t = cart.totals;
  t.net += price;
  t.lines += 1;
  return t.net;
}
