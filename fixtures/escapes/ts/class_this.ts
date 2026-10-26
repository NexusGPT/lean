// expect: receiver-mutation
export class Counter {
  n = 0;
  bump(): number {
    this.n = this.n + 1;
    return this.n;
  }
}
