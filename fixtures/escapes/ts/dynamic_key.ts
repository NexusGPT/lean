// expect: dynamic-key
export function pick(o: { a: number; b: number }, k: string): number {
  return o[k as "a" | "b" | "c"];
}
