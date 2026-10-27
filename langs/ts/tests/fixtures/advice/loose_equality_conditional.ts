// expect: loose-equality conditional
export function same(a: { k: number } | string, b: string): boolean {
  return a == b;
}
