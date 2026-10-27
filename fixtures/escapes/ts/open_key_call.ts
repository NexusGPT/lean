// expect: dynamic-key
export function read(r: { a: number; b: number }, prefix: string): unknown {
  // @ts-ignore a string has no closed key domain
  return r[prefix.trim()];
}
