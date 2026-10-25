// expect: prototype
export function proto(x: { a: number }): number {
  return Object.getPrototypeOf(x) === undefined ? 0 : 1;
}
