export class Base {
  count = 0;
  record(n: number): void { this.count = this.count + 1; }
  compute(x: number): number { return x; }
  label(): string { return "base"; }
}
