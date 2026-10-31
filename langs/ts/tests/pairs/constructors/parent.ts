import { patch } from "./outside";

// constructors (heap-stage5.md section 21): a constructor allocates the instance with each field's default, stores its
// parameter properties and its field initializers in declaration order, then runs its body on the fresh reference
export class Meter {
  reading = 0;
  unit = "kWh";
  log: number[] = [];
  constructor(start: number) {
    this.reading = start;
  }
}

export class Gauge {
  level = 1;
  max: number;
  constructor(max: number) {
    this.max = max;
  }
}

export class Span {
  constructor(public start: number, readonly end: number) {}
}

export class Cell {
  count = 0;
  constructor(private readonly name: string, public size: number) {
    this.count = size;
  }
}

export class Shape {
  sides: number;
  constructor(sides: number) {
    this.sides = sides;
  }
}

export class Square extends Shape {
  side: number;
  constructor(side: number) {
    super(4);
    this.side = side;
  }
}

export class Triangle extends Shape {
  side: number;
  constructor(side: number) {
    super(3);
    this.side = side;
  }
}

export function metered(n: number): number {
  const m = new Meter(n);
  return m.reading;
}

export function span(a: number, b: number): Span {
  return new Span(a, b);
}

export function sized(n: string, s: number): number {
  const c = new Cell(n, s);
  return c.count + c.size;
}

export function perimeter(n: number): number {
  const s = new Square(n);
  return s.sides * s.side;
}

export class Tally {
  count = 0;
  constructor(public label: string) {}
  bumped(): number {
    this.count += 1;
    return this.count;
  }
  shared(): number {
    patch(this);
    return this.count;
  }
}

export function kept(n: string): number {
  const t = new Tally(n);
  t.count = 2;
  return t.bumped();
}

export function handed(n: string): number {
  const t = new Tally(n);
  patch(t);
  return t.bumped();
}

export function relayed(n: string): number {
  const t = new Tally(n);
  t.shared();
  return t.bumped();
}
