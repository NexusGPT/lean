// stage 5 step 21: a constructor allocates the instance, stores its parameter properties and field initializers, then
// runs its body on the fresh reference; `new C(..)` runs it, or allocates inline when the class declares none
export class Point {
  constructor(public x: number, public y: number) {}
}

export class Tally {
  count = 0;
  names: string[] = [];
  label: string;
  bumped(): number {
    this.count += 1;
    return this.count;
  }
  constructor(label: string) {
    const l = label;
    this.label = l;
  }
}

export class Box {
  items: number[] = [];
  open = true;
}

export function origin(): Point {
  return new Point(0, 1);
}

export function start(n: string): Tally {
  return new Tally(n);
}

export function empty(): Box {
  return new Box();
}

export function shifted(p: Point): Point {
  const nx = p.x + 1;
  return new Point(nx, p.y);
}

export function build(n: string): number {
  const t = new Tally(n);
  t.count += 1;
  return t.count;
}
