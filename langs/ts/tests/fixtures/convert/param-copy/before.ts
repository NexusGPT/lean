// param-copy: a parameter lean refuses to see rebound is copied to a local at entry
export function shout(lines: string[]): string[] {
  return lines.map((line) => {
    line = line.trim();
    if (line.length === 0) return '-';
    return line.toUpperCase();
  });
}

export function positiveSum(...xs: number[]): number {
  xs = xs.filter((x) => x > 0);
  let s = 0;
  for (const x of xs) s += x;
  return s;
}
