// expect: unsupported-member
// push borrowed onto a value that is not an array: Array.prototype.push is generic and writes `length` and the indexes
// of any object, which is not the array's own push; a borrowed method is read only when `this` is a plain path to an
// array (design/push-apply.md)
export function appendTo(a: string[], c: { length: number; [i: number]: string }, b: string[]): number {
  a.push.apply(c, b);
  return c.length;
}
