type Box = { n: number };
type Wrap = { a: Box; xs: number[] };
type Pair = { a: Box; b: Box };

// A tree of literals written in the call: no name holds an inner object.
export function nested(g: (w: Wrap) => void, k: number): number {
  g({ a: { n: 1 }, xs: [1, 2] });
  return k;
}

// The inner object is the caller's own: g may write p through it.
export function existingInside(g: (w: { a: Box }) => void, p: Box): number {
  g({ a: p });
  return p.n;
}

// One inner object in both slots: g may see that a and b are one object.
export function shared(g: (w: Pair) => boolean): boolean {
  const i = { n: 1 };
  return g({ a: i, b: i });
}
