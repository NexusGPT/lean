type Box = { n: number };

export function guarded(g: (b: Box) => void, p: Box, c: boolean): number {
  const n = p.n;
  if (c) {
    g(p);
    return 0;
  }
  return n;
}

export function broken(g: (b: Box) => void, p: Box, k: number): number {
  const n = p.n;
  switch (k) {
    case 1:
      g(p);
      break;
    default:
      return 0;
  }
  return n;
}

export function caught(g: (b: Box) => void, p: Box, c: boolean): number {
  const n = p.n;
  try {
    if (c) {
      g(p);
      throw new Error("stop");
    }
  } catch {
    return n;
  }
  return 0;
}
