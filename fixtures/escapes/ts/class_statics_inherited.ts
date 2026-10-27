// expect: global-read
// a static the class inherits is declared on another class: Sub.twice() runs Base.twice with this = Sub
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
