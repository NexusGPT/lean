// tuples and intersections in the heap core (heap-stage5.md section 17, 2026-10-31): a tuple a unit returns, destructured
// by its caller, reads its positions; a type parameter bounded by an intersection of records is the record of all their
// fields; a tuple of records holds references
export type Point = { x: number; y: number };
export type Named = { name: string };
export type Aged = { age: number };

function ends(p: Point): [number, number] {
  return [p.x, p.y];
}

export function spread(p: Point): number {
  const [lo, hi] = ends(p);
  return hi - lo;
}

function entry(p: Named & Aged): [string, number] {
  return [p.name, p.age];
}

export function caption(p: Named & Aged): string {
  const [name, age] = entry(p);
  return `${name}:${age}`;
}

export function describe<T extends Named & Aged>(p: T): string {
  return `${p.name} (${p.age})`;
}

export function older<T extends Named & Aged>(p: T): T {
  p.age = p.age + 1;
  return p;
}

export function width(seg: [Point, Point]): number {
  return seg[1].x - seg[0].x;
}

export function tag(pair: [Point, Named]): string {
  const [at, who] = pair;
  return `${who.name}@${at.x}`;
}

export function joined(a: Point, b: Point): [Point, Point] {
  return [a, b];
}
