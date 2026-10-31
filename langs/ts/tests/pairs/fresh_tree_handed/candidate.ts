type Box = { n: number };
type Wrap = { a: Box; xs: number[] };
type Pair = { a: Box; b: Box };

// The same tree built from a named primitive.
export function nested(g: (w: Wrap) => void, k: number): number {
  const n = 1;
  g({ a: { n }, xs: [n, 2] });
  return k;
}

// A new inner object with p's field: g's write no longer reaches p.
export function existingInside(g: (w: { a: Box }) => void, p: Box): number {
  g({ a: { n: p.n } });
  return p.n;
}

// Two inner objects: g sees two objects.
export function shared(g: (w: Pair) => boolean): boolean {
  return g({ a: { n: 1 }, b: { n: 1 } });
}
