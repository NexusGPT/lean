export function good(x: number): number {
  return x + 1;
}

export function bad(x: number): number {
  return Math.random() + x;
}

export function alsoGood(x: number): number {
  return x * 2;
}
