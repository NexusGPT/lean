// a wrong after: the proof must refute it with a WITNESS
// closure-counter: a forEach whose callback writes one local of the function becomes a reduce that carries it
type Node = { cy: number; h: number; kids: number[] };

export function centroidOf(c: Node[]): number {
  let centroid = 0;
  centroid = c.reduce<number>((acc, n) => {
    let centroid = acc;
    centroid += n.cy;
    return centroid;
  }, centroid);
  return c.length > 0 ? centroid / c.length : 0;
}

export function topOf(c: Node[], floor: number): number {
  let top = floor;
  top = c.reduce<number>((acc2, n) => {
    let top = acc2;
    if (n.h <= 0) return top;
    if (n.cy - n.h / 2 < top) top = n.cy - n.h / 2;
    return top;
  }, 0);
  return top;
}

export function weight(c: Node[]): number {
  let total = 0;
  total = c.reduce<number>((acc4, n) => {
    let total = acc4;
    total = n.kids.reduce<number>((acc3, k) => {
      let total = acc3;
      total += k * n.h;
      return total;
    }, total);
    return total;
  }, total);
  return total;
}
