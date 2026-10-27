// a static member of a same-file class: a static method is its unit, a static field a module cell
export class Pricing {
  static readonly RATE = 3;
  static readonly BULK = 4;
  static readonly LABEL = "item";
  static calls = 0;
  static unit(n: number): number {
    return n * Pricing.RATE;
  }
  static fee(n: number): number {
    return n * Pricing.BULK + 1;
  }
  static total(n: number, extra: number): number {
    return extra + n * Pricing.RATE;
  }
  static track(n: number): number {
    Pricing.calls += n;
    return Pricing.calls;
  }
  static describe(n: number): string {
    return Pricing.LABEL + ":" + String(Pricing.unit(n));
  }
}
export function quote(n: number): number {
  return Pricing.unit(n) + 2;
}
