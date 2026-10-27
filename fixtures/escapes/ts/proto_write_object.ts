// expect: prototype
// `d[k] = v` with k = '__proto__' and an object value replaces the dictionary's prototype through the setter of
// Object.prototype and makes no key: index('__proto__') owns nothing afterwards and reads `n` through the new prototype
export interface Entry { n: number }
export function index(k: string, n: number): number {
  const d: Record<string, Entry> = {};
  d[k] = { n };
  return Object.keys(d).length;
}
