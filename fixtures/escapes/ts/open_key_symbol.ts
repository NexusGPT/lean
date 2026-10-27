// expect: dynamic-key
const TAG: unique symbol = Symbol("tag");
interface Tagged {
  [TAG]: number;
  a: number;
}
export function read(r: Tagged): number {
  return r[TAG];
}
