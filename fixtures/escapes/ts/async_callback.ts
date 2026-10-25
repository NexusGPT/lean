// expect: async
export function laters(xs: number[]): number[] {
  return xs.map(async (x) => x + 1).length === 0 ? [] : xs;
}
