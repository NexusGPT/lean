export function choose(n: number, second: boolean): number {
  if (n > 0) {
    if (second) return 1;
    return 2;
  }
  if (n === 0) return 3;
  return 4;
}
export function wrong(n: number, second: boolean): number {
  if (n > 0) {
    if (second) return 1;
    return 2;
  }
  if (n === 0) return 30;
  return 4;
}
