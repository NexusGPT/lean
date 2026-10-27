// expect: closure-mutation
// a procedure parameter named like a unit local that a call passes something else: the splice would shadow the local
export function shifted(xs: number[], k: number): number {
  let acc = 0;
  const add = (k: number): void => { acc = acc + k; };
  for (const x of xs) add(x);
  return acc + k;
}
