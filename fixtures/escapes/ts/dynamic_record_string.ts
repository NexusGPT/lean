// expect: dynamic-key
export function read(r: { a: number; run(): number }, k: string): unknown {
  // an open key may select the method: the open-key reading takes records of data fields only
  // @ts-ignore a string has no closed key domain
  return r[k];
}
