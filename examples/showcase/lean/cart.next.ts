export type Totals = { net: number; lines: number };
export type Cart = { id: string; totals: Totals };

export function addLine(cart: Cart, price: number): number {
  const net = cart.totals.net + price;
  cart.totals.net = net;
  cart.totals.lines = cart.totals.lines + 1;
  return net;
}
