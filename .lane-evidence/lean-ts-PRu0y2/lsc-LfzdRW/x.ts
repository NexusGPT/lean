export function bump(x: number | undefined, d: number): number {
  if (x !== undefined) return x + 1;
  return d;
}

export function orDefault(x: number | undefined, d: number): number {
  return x ?? d;
}

export function lift(x: number): number | undefined {
  return x > 0 ? x : undefined;
}
