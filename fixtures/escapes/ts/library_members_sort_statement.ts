// expect: unsupported-call
// the statement form with no comparator; write xs = [...xs].sort()
export function sorted(xs: string[]): string[] {
  const c = [...xs];
  c.sort();
  return c;
}
