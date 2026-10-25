// expect: dynamic-key
export function pick(o: { [k: string]: number }, k: string): number {
  return o[k];
}
