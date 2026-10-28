// expect: unsupported-member
// push used as a value: the function value is called with the array as its receiver; write a.push(...b)
export function append(a: string[], b: string[]): number {
  a.push.apply(a, b);
  return a.length;
}
