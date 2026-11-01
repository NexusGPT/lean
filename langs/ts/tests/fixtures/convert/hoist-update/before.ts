// hoist-update: a step used as a value becomes a statement before the one that held it
type Cache = { label?: string; hits: number };

export function labelOf(c: Cache, fallback: string): string {
  return c.label || (c.label = fallback);
}

export function nextIds(seen: boolean[], start: number): number[] {
  let next = start;
  const out: number[] = [];
  for (const s of seen) {
    const id = s ? -1 : next++;
    out.push(id);
  }
  return out.concat([next]);
}

export function smallest(xs: number[]): number {
  const ys = [...xs];
  const first = ys.sort((a, b) => a - b)[0];
  return first === undefined ? -1 : first;
}
