// a wrong after: the proof must refute it with a WITNESS
// hoist-update: a step used as a value becomes a statement before the one that held it
type Cache = { label?: string; hits: number };

export function labelOf(c: Cache, fallback: string): string {
  if (c.label === undefined) {
    c.label = fallback;
  }
  return c.label;
}

export function nextIds(seen: boolean[], start: number): number[] {
  let next = start;
  const out: number[] = [];
  for (const s of seen) {
    let value: number;
    if (s) {
      value = -1;
    } else {
      value = next++;
    }
    const id = value;
    out.push(id);
  }
  return out.concat([next]);
}

export function smallest(xs: number[]): number {
  const ys = [...xs];
  ys.sort((a, b) => a - b);
  const first = ys[0];
  return first === undefined ? -1 : first;
}
