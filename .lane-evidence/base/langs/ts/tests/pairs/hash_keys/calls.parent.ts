// a transition's key covers the code a value the unit touches may carry to the outside, not every method of the file
import { stamp, keep, Item } from "./store";

export class Tally {
  count = 0;
  add(n: number): void {
    this.count += n;
  }
}

export function cost(i: Item): number {
  return stamp(i.id) + i.qty;
}

export function priced(i: Item): number {
  return stamp(i.id) + scale(i.qty);
}

export function enroll(t: Tally, n: number): number {
  keep(t);
  return t.count + n;
}

export class Cart {
  total = 0;
  charge(id: number): number {
    return stamp(id) + this.total;
  }
  fee(id: number): number {
    return stamp(id) + this.rate(id);
  }
  rate(id: number): number {
    return id * 2;
  }
  note(): string {
    return "cart";
  }
}

function scale(q: number): number {
  return q * 2;
}
