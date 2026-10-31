// `this.m()` runs the m the receiver's own chain finds first (ECMA-262 10.1.8.1 [[Get]], then Call). The class's own m
// is the answer only when no subclass can hold another m (design/conformance-readings.md section 4)
// m declared final on the method itself (@final): the class's own m, under the named assumption
export class Tagged {
  /** @final */
  base(x: number): number { return x + 1; }
  run(x: number): number { return (x + 1) * 2; }
}
// #m: a private name is no property, never looked up on the chain
export class Named {
  #base(x: number): number { return x + 1; }
  run(x: number): number { return (x + 1) * 2; }
}
// a final class whose subclass in the file redeclares m: the tag is defeated
/** @final */
export class Broken {
  base(x: number): number { return x + 1; }
  run(x: number): number { return (x + 1) * 2; }
}
export class Mute extends Broken { base(y: number): number { return 0; } }
export function viaMute(x: number): number { return new Mute().run(x); }
// protected: a subclass may redeclare it; the override lives outside the file
export class Guarded {
  protected base(x: number): number { return x + 1; }
  run(x: number): number { return (x + 1) * 2; }
}
// this.m() in a constructor: the receiver is the instance a subclass's constructor makes, too
export class Built {
  v: number;
  constructor(x: number) { this.v = x + 1; }
  base(x: number): number { return x + 1; }
}
// this.m() inside an arrow of a method: the arrow's this is the method's
export class Mapped {
  base(x: number): number { return x + 1; }
  all(xs: number[]): number[] { return xs.map((x) => x + 1); }
}
// m inherited from a base of this file: the receiver's chain may hold another m above the base's
export class Root { base(x: number): number { return x + 1; } }
export class Leaf extends Root { run(x: number): number { return (x + 1) * 2; } }
// the same-file override reached through a subclass the file declares two levels down
export class Top {
  base(x: number): number { return x + 1; }
  run(x: number): number { return (x + 1) * 2; }
}
export class Middle extends Top {}
export class Bottom extends Middle { base(y: number): number { return 0; } }
export function viaBottom(x: number): number { return new Bottom().run(x); }
// a changed #base under an unchanged run: the receiver is an instance the constructor made (a proxy holds no brand)
export class Shifted {
  #base(x: number): number { return x + 2; }
  run(x: number): number { return this.#base(x) * 2; }
}
// a class holding a private name whose constructor takes an argument lane B does not draw
export class Counted {
  #n: number;
  constructor(n: number) { this.#n = n; }
  run(x: number): number { return this.#n + x; }
}
