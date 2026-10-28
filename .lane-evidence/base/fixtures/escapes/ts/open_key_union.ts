// expect: dynamic-key
interface A { kind: "a"; x: number }
interface B { kind: "b"; y: string }
export function read(r: A | B, k: string): unknown {
  // @ts-ignore a string has no closed key domain
  return r[k];
}
