// expect: dynamic-key migration
export function read(r: { a: number; run(): number }, k: string): unknown {
  // @ts-ignore a string has no closed key domain
  return r[k];
}
