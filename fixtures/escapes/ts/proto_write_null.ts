// expect: prototype
// a null written under a key that may be '__proto__' makes the dictionary's prototype null: `'toString' in d` turns false
export interface Entry { n: number }
export function clear(k: string): number {
  const d: Record<string, Entry | null> = {};
  d[k] = null;
  return Object.keys(d).length;
}
