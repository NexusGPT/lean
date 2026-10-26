export function good(x: number): number {
  return x + 1;
}

export function bad(x: number): number {
  return eval("x") + x;
}

export function alsoGood(x: number): number {
  return x * 2;
}
