// expect: operator-value-context
export function optionalUpdate(sink: { put(n: number): number } | undefined): number {
  let i = 0;
  const value = sink?.put(i++);
  return value === undefined ? i : value + i;
}
