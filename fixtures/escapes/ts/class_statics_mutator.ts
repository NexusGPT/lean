// expect: param-mutation
// an in-place mutator on a static changes module state the value reading does not write back
export class Cache {
  static readonly seen: Set<string> = new Set();
}
export function remember(k: string): number {
  Cache.seen.add(k);
  return Cache.seen.size;
}
