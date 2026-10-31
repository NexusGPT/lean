// The read moved before the call: g may write x.n, so the parent may return another number.
export function local(g: (b: { n: number }) => void): number {
  g({ n: 1 });
  return 1;
}

// The literal built from a named primitive: the same object handed, the same result.
export function inline(g: (b: { n: number }) => void, k: number): number {
  const n = 1;
  g({ n });
  return k;
}
