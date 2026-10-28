// expect: index-assign
export function write(r: { a: number; b: number }, k: string): number {
  // @ts-ignore a string has no closed key domain
  r[k] = 1;
  return r.a;
}
