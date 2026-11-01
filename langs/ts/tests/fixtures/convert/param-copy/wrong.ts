// a wrong after: the proof must refute it with a WITNESS
// param-copy: a parameter lean refuses to see rebound is copied to a local at entry
export function shout(lines: string[]): string[] {
  return lines.map((lineArg) => {
    let line = lineArg;
    line = line.trim();
    if (line.length === 0) return '-';
    return line.toUpperCase();
  });
}

export function positiveSum(...xsArg: number[]): number {
  let xs = xsArg.slice(1);
  xs = xs.filter((x) => x > 0);
  let s = 0;
  for (const x of xs) s += x;
  return s;
}
