// expect: dynamic-key
class Point {
  x = 0;
  y = 0;
}
export function read(p: Point, k: string): unknown {
  // an open key on a class instance reaches its prototype (`constructor`), which a record value does not hold
  // @ts-ignore a string has no closed key domain
  return p[k];
}
