// expect: dynamic-key
interface Box {
  readonly a: number;
  get b(): number;
}
export function read(r: Box, k: string): unknown {
  // an open key may run the getter
  // @ts-ignore a string has no closed key domain
  return r[k];
}
