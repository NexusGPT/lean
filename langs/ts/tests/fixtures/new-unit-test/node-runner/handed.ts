// the node:test dialect of a test that calls what the unit handed out and spies on the callback it was given
export function counter(start: number) {
  let n = start;
  return { next(): number { n += 1; return n; }, reset(): void { n = start; } };
}
export function mapAll(items: string[], f: (s: string) => number): number[] {
  return items.map((s) => f(s));
}
