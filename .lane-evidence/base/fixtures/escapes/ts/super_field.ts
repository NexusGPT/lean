// expect: class
export class Base { compute(x: number): number { return x; } }
export class Child extends Base {
  twice(n: number): number {
    const f = super.compute;
    return f(n) + f(n);
  }
}
