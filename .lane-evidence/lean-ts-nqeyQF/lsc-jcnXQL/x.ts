// a call to a same-file function may omit a defaulted parameter; the default fills it
export function pad(s: string, width: number, fill: string = " "): string {
  return s.length >= width ? s : s + fill + fill;
}
export function padAll(xs: readonly string[]): readonly string[] {
  return xs.map((x) => pad(x, 4));
}
export function widths(xs: readonly string[]): number {
  let total = 0;
  for (const x of padAll(xs)) total = total + x.length;
  return total;
}
