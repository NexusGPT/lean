// stage 5 step 13: arithmetic. `*` is exact; `%` is the truncated remainder, a zero divisor marking the world (the
// lemma shows it never happens on either side); the bitwise operators read their 32-bit operands; an update or a
// compound write is the operator and the store
export interface Cart { qty: number; price: number; flags: number }

export function total(c: Cart): number {
  return c.qty * c.price;
}

export function evenQty(c: Cart): boolean {
  return c.qty % 2 === 0;
}

export function bump(c: Cart): void {
  c.qty++;
  c.flags = c.flags | 4;
}

export function share(c: Cart, parts: number): number {
  return c.price % parts;
}

export function debt(c: Cart): number {
  return -c.price;
}

export function flip(c: Cart): number {
  return 0 - c.price;
}
