export function orZero(m: Map<string, number>, k: string): number {
  return m.get(k) ?? 0;
}

export function firstOr(xs: number[], d: number): number {
  return xs.find((x) => x > 0) ?? d;
}

export function bumpOr(m: Map<string, number>, k: string): number {
  return (m.get(k) ?? 1) + 1;
}

export function plain(m: Map<string, number>, k: string): number {
  return m.get(k) ?? 0;
}
