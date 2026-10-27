// expect: any-type migration
export function firstTwo(xs: any): number {
  return xs.length > 1 ? xs.map((x: number) => x * 2)[0] : 0;
}
export function caller(): number { return firstTwo("ab"); }
