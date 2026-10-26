// expect: async-callback
export function bad(xs: number[]): number {
  xs.map(async x => x + 1);
  return xs.length;
}
