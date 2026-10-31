export function orZero(m: Map<string, number>, k: string): number {
  const v: number | null | undefined = m.get(k);
  return v ?? 0;
}

export function firstOr(xs: number[], d: number): number {
  const v: number | null | undefined = xs.find((x) => x > 0);
  return v ?? d;
}

export function bumpOr(m: Map<string, number>, k: string): number {
  const v: number | null | undefined = m.get(k);
  return (v ?? 0) + 1;
}

export function plain(m: Map<string, number>, k: string): number {
  return m.get(k) ?? 0;
}
