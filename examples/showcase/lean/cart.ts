export type Totals = { net: number; lines: number };
export type Cart = { id: string; totals: Totals };

export function addLine(cart: Cart, price: number): number {
  cart.totals.net += price;
  cart.totals.lines += 1;
  return cart.totals.net;
}
