// expect: ts-strict
// strict errors no erased edit fixes, so lean convert lists them and the lint refuses the units: a union the code
// never narrows (TS2339), a possibly absent value used as a value rather than read through (TS2322), and a cast the
// compiler rejects (TS2352). Each needs a design change a person makes: a narrowing test, a default, a real conversion.
export interface Keyed { key: string }
export interface Numbered { id: number }

export function idOf(x: Keyed | Numbered): number {
  return x.id;
}

export function nameOr(u: { name?: string }): string {
  return u.name;
}

export function asCount(s: string): number {
  return (s as number) + 1;
}
