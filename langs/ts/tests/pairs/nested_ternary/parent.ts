export function choose(n: number, second: boolean): number {
  return n > 0 ? (second ? 1 : 2) : (n === 0 ? 3 : 4);
}
export function wrong(n: number, second: boolean): number {
  return n > 0 ? (second ? 1 : 2) : (n === 0 ? 3 : 4);
}
