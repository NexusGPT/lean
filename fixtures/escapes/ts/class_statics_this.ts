// expect: static-this
// in a static method `this` is the class the call names: Sub.twice() reads Sub.base, not Base.base
export class Base {
  static base = 1;
  static twice(): number {
    return this.base * 2;
  }
}
export class Sub extends Base {
  static base = 5;
}
export function viaSub(): number {
  return Sub.twice();
}
