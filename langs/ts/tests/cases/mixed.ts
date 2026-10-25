export function good(x: number): number {
  return x + 1;
}

export function bad(x: number): number {
  return (x as number) + 2;
}

export function alsoGood(x: number): number {
  return x * 2;
}
