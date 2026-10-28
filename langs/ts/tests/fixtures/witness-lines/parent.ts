export function frozen(x: number): number {
  return Object.freeze({ value: x + 1 }).value;
}
