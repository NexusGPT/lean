// expect: non-null
export function unwrap(x: number | undefined): number {
  return x!;
}
