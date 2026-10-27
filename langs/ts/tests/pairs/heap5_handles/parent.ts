// stage 5 step 18: a method of another instance of a class of this file, or of a handle (an object with methods,
// here an interface), is a transition of the whole heap world: a subclass elsewhere may override it
export interface Ledger { record(amount: number): void; balance(): number }

export class Account {
  total = 0;
  deposit(n: number): void {
    this.total += n;
  }
}

export function fund(a: Account, n: number): number {
  a.deposit(n);
  return a.total;
}

export function settle(l: Ledger, n: number): number {
  l.record(n);
  return l.balance();
}

export function transfer(from: Account, to: Account, n: number): void {
  from.deposit(-n);
  to.deposit(n);
}

export function audit(l: Ledger): number {
  return l.balance();
}

export function report(l: Ledger, n: number): number {
  const b = l.balance();
  return b + n;
}
