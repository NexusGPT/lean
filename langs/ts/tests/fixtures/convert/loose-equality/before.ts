// loose-equality: == becomes === where the lint decides the operand types prove it; a site it leaves conditional is listed
export function sameKind<T extends number>(a: T, b: T): boolean {
  return a == b;
}

export function same(a: { k: number } | string, b: string): boolean {
  return a == b;
}
