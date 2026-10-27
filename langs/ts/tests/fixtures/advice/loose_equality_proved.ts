// expect: loose-equality proved
export function sameKind<T extends number>(a: T, b: T): boolean {
  return a == b;
}
