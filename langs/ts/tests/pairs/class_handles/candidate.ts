// stage 5 step 18, the handle held: an instance of a class of this file or a handle (an interface with methods) held in
// a local, two names of one instance, and one handed to a callee of this file. Each name is the same reference: a field
// written through one is read through the other, and a method called through any of them is one transition of the
// whole heap world
export interface Ledger { record(amount: number): void; balance(): number }

export class Account {
  total = 0;
  deposit(n: number): void {
    this.total += n;
  }
}

export function add(a: Account, n: number): void {
  a.total += n;
}

export function bump(a: Account, n: number): void {
  a.deposit(n);
}

export function log(l: Ledger, n: number): void {
  l.record(n);
}

export function held(a: Account, n: number): number {
  a.total += n;
  a.deposit(1);
  return a.total;
}

export function keep(l: Ledger, n: number): number {
  l.record(n);
  return l.balance();
}

export function alias(a: Account, n: number): number {
  const before = a.total;
  const h = a;
  h.total = n;
  return before;
}

export function twice(a: Account, n: number): number {
  a.total += 2 * n;
  return a.total;
}

export function both(x: Ledger, y: Ledger, n: number): number {
  const b = y.balance();
  x.record(n);
  return b;
}

export function pay(a: Account, n: number): number {
  a.total += n;
  return a.total;
}

export function step(l: Ledger, n: number): number {
  l.record(n);
  return l.balance();
}

export function charge(a: Account, n: number): number {
  const t = a.total;
  bump(a, n);
  return t;
}
