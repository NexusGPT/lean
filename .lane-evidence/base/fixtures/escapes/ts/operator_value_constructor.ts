// expect: operator-value-context
export function constructorTarget(a: { C: new () => object }, b: { C: new () => object }): object {
  let current = a;
  return new (current = b).C();
}
