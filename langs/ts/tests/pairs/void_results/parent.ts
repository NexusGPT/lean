// heap stage 5, section 8 (void results): a procedure returns the unit value and is compared on the heap it leaves.
// Each void form of the section, one unit each: a body falling off its end (declared and inferred void), a branch
// falling through to the rest, a bare return (nested, in an else), an expression body (a same-file call), and a
// return of a same-file procedure's call (the expression-body reading in a return); a method of a class
export interface Cart { total: number; count: number; items: string[] }

export function add(c: Cart, name: string, price: number): void {
  c.items.push(name);
  c.total += price;
  c.count += 1;
}

export function bump(c: Cart) {
  c.count += 1;
}

export function cap(c: Cart, n: number): void {
  if (c.total > n) {
    c.total = n;
  }
  c.count = 0;
}

export function guard(c: Cart, n: number): void {
  if (c.count > 0) {
    if (n < 0) {
      return;
    }
    c.total += n;
  }
  c.count += 1;
}

export function onlyEmpty(c: Cart): void {
  if (c.count === 0) {
    c.total = 0;
  } else {
    return;
  }
  c.items = [];
}

export const addOne = (c: Cart, name: string): void => add(c, name, 1);

export function addFree(c: Cart, name: string): void {
  if (c.count > 10) return add(c, name, 0);
  add(c, name, 3);
}

export function refill(c: Cart, name: string): void {
  if (c.count === 0) return add(c, name, 5);
  c.total += 1;
}

export function topUp(c: Cart, name: string): void {
  if (c.count === 0) return add(c, name, 5);
  c.total += 1;
}

export class Counter {
  n = 0;
  tick(): void {
    if (this.n > 5) {
      return;
    }
    this.n += 1;
  }
}
