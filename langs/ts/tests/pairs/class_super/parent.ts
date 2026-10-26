import { Base } from "./base";

/** a counter over the parent's record: the parent sees every event, this class keeps the total */
export class Counter extends Base {
  total: number;
  constructor() { super(); this.total = 0; }

  record(n: number): number {
    super.record(n);
    this.total = this.total + n;
    return this.total;
  }

  describe(x: number): number {
    return super.compute(x) + 1;
  }

  name(): string {
    const l = super.label();
    return l + ":counter";
  }
}
