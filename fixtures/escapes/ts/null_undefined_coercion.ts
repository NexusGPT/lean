// expect: loose-equality
export function coercive(x: number | null | undefined): boolean {
  return x == 0;
}
