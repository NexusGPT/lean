// expect: for-of-non-array
// an iterable whose type is named Promise: the lint refuses it as a promise, not as an array, set, map or string
class Promise<T> implements Iterable<T> {
  constructor(private readonly items: T[]) {}
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}

export function total(xs: Promise<number>): number {
  let n = 0;
  for (const x of xs) n += x;
  return n;
}
