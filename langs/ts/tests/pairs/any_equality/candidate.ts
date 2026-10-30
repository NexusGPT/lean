// === on a value typed any or unknown: NaN is not equal to itself, so the comparison is not settled by the operands' sameness
export function selfEq(p: any): boolean {
  return true;
}

export function neq(p: any, q: any): boolean {
  return !(p === q);
}

export function narrowed(p: unknown): boolean {
  if (typeof p === 'number') return true;
  return false;
}

export function sameSelf(p: unknown): boolean {
  return true;
}

export function switchSelf(p: any): number {
  return 1;
}

export function unknownSym(p: unknown, q: unknown): boolean {
  return p === q;
}
