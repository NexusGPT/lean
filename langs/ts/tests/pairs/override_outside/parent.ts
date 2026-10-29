// `this.m()` runs the m the receiver's own chain finds first (ECMA-262 10.1.8.1 [[Get]], then Call): a subclass the
// file does not see may override m, so a method that calls this.m() is not the class's m inlined
export class Greeter {
  base(x: number): number { return x + 1; }
  run(x: number): number { return this.base(x) * 2; }
}
// a subclass overriding base: it stands for one another file declares, which the reading of Greeter.run cannot see
export class Quiet extends Greeter { base(y: number): number { return 0; } }
export function viaOverride(x: number): number { return new Quiet().run(x); }
/** @sealed */
export class Sealed {
  base(x: number): number { return x + 1; }
  run(x: number): number { return this.base(x) * 2; }
}
export class Hidden {
  private base(x: number): number { return x + 1; }
  run(x: number): number { return this.base(x) * 2; }
}
