// === on a value typed any or unknown: NaN is not equal to itself, so the comparison is not settled by the operands' sameness
export function selfEq(p: any): boolean {
  return p === p;
}

export function neq(p: any, q: any): boolean {
  return p !== q;
}

export function narrowed(p: unknown): boolean {
  if (typeof p === 'number') return p === p;
  return false;
}

export function sameSelf(p: unknown): boolean {
  return Object.is(p, p);
}

export function switchSelf(p: any): number {
  switch (p) {
    case p: return 1;
    default: return 0;
  }
}

export function unknownSym(p: unknown, q: unknown): boolean {
  return p === q;
}
