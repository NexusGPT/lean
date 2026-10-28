// expect: unsupported-member
// a list that is not an array: apply lists `length` and the indexes (CreateListFromArrayLike), a spread iterates, so a
// string, a Set or an array-like record differ, and apply on undefined passes nothing where a spread throws; write
// a.push(...b) with b an array (design/push-apply.md)
export function appendAll(a: string[], list: any): number {
  a.push.apply(a, list);
  return a.length;
}
