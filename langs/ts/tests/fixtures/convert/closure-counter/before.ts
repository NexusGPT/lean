// closure-counter: a forEach whose callback writes one local of the function becomes a reduce that carries it
type Node = { cy: number; h: number; kids: number[] };

export function centroidOf(c: Node[]): number {
  let centroid = 0;
  c.forEach((n) => { centroid += n.cy; });
  return c.length > 0 ? centroid / c.length : 0;
}

export function topOf(c: Node[], floor: number): number {
  let top = floor;
  c.forEach((n) => {
    if (n.h <= 0) return;
    if (n.cy - n.h / 2 < top) top = n.cy - n.h / 2;
  });
  return top;
}

export function weight(c: Node[]): number {
  let total = 0;
  c.forEach((n) => {
    n.kids.forEach((k) => { total += k * n.h; });
  });
  return total;
}
