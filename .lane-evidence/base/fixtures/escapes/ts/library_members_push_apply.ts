// expect: unsupported-member
// push bound as a value: the function value is called later with the array as its receiver; write a.push(...b)
// (a call through apply or call on the array itself is the direct call, design/push-apply.md)
export function append(a: string[], b: string[]): number {
  const add = a.push.bind(a);
  add(...b);
  return a.length;
}
