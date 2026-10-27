export type Totals = { net: number; lines: number };
export type Cart = { id: string; totals: Totals };

export function addLine(cart: Cart, price: number): number {
  const t = cart.totals;
  const net = t.net + price;
  t.net = net;
  t.lines = t.lines + 1;
  return net;
}
