// expect: prototype
// a static read through this.constructor depends on the run-time class of the receiver
export class Shape {
  static sides = 0;
  count(): number {
    return (this.constructor as typeof Shape).sides;
  }
}
export function sidesOf(s: Shape): number {
  return s.count();
}
