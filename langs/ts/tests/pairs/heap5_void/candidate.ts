// stage 5 step 8: a procedure (a void result) returns the unit value; its body may fall off its end, a branch may
// fall through to the rest, a bare return ends it
export interface Cart { total: number; count: number; items: string[] }

export function add(c: Cart, name: string, price: number): void {
  c.items.push(name);
  c.total += price;
  c.count += 1;
}

export function discount(c: Cart): void {
  if (c.total >= 100) {
    c.total -= 10;
  }
}

export function clear(c: Cart): void {
  if (c.count !== 0) {
    c.items = [];
    c.count = 0;
    c.total = 0;
  }
}

export function addTwice(c: Cart, name: string): void {
  add(c, name, 1);
  add(c, name, 1);
  return;
}
