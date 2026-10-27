// expect: closure-mutation
// a call that passes a defaulted parameter a value that may be undefined: the default would apply for that value, so the
// function is no procedure (a splice binds the value as passed); as a lambda it cannot write the unit's cell
export function weighted(xs: number[], w: number | undefined): number {
  let acc = 0;
  const add = (x: number, by: number = 1): void => { acc = acc + x * by; };
  for (const x of xs) add(x, w);
  return acc;
}
