// expect: static-this
// in a static method `this` is the class the call names; with a destructured parameter there is no opaque unit to read
export class Base {
  static base = 1;
  static scaled({ k }: { k: number }): number {
    return this.base * k;
  }
}
export function viaBase(k: number): number {
  return Base.scaled({ k });
}
