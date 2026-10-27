// expect: nested-ternary proved
export function choose(n: number, second: boolean): number {
  return n > 0 ? (second ? 1 : 2) : (n === 0 ? 3 : 4);
}
export function direct(a: boolean, b: boolean): number {
  return a ? b ? 1 : 2 : 3;
}
