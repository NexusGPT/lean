/** Ledger opens one unit higher (a changed behaviour); opening returns one more; open is a refactor; the rest is untouched */
export class Account {
  balance: number;
  owner: string;
  history: number[] = [];

  constructor(owner: string, opening: number) {
    this.owner = owner;
    this.balance = opening;
  }

  deposit(n: number): number {
    this.balance = this.balance + n;
    this.history.push(n);
    return this.balance;
  }

  label(): string {
    return this.owner + ":" + this.balance;
  }
}

/** opens an account and makes the first deposit */
export function open(owner: string, first: number): number {
  const a = new Account(owner, 0);
  const after = a.deposit(first);
  return after;
}

/** the opening balance of a fresh account */
export function opening(owner: string, n: number): number {
  const a = new Account(owner, n);
  return a.balance + 1;
}

/** two deposits */
export function twice(owner: string, n: number): number {
  const a = new Account(owner, 0);
  a.deposit(n);
  a.deposit(n);
  return a.balance;
}

/** a ledger with a limit: its constructor is the unit under test */
export class Ledger {
  limit: number;
  used: number;

  constructor(max: number) {
    this.limit = max + 1;
    this.used = 0;
  }

  take(n: number): boolean {
    if (this.used + n > this.limit) return false;
    this.used = this.used + n;
    return true;
  }
}
