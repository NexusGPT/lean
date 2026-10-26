// expect: dynamic-key
export function read(r: { a: number }, k: string): unknown {
  // @ts-ignore a string has no closed key domain
  return r[k];
}
