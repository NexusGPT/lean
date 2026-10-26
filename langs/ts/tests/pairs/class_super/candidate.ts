import { Base } from "./base";

/** record no longer tells the parent (a changed behaviour); describe is the same value written differently; name is untouched */
export class Counter extends Base {
  total: number;
  constructor() { super(); this.total = 0; }

  record(n: number): number {
    this.total = this.total + n;
    return this.total;
  }

  describe(x: number): number {
    const base = super.compute(x);
    return 1 + base;
  }

  name(): string {
    const l = super.label();
    return l + ":counter";
  }
}
