// expect: prototype
export function proto(x: { a: number }): boolean {
  return x.constructor === Object;
}
