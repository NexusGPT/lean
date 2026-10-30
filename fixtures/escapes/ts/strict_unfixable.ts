// expect: ts-strict
// strict errors no erased edit fixes, so lean convert lists them: a union the code never narrows (TS2339), a possibly
// absent value used as a value rather than read through (TS2322), and a cast the compiler rejects (TS2352). Each needs
// a design change a person makes: a narrowing test, a default, a real conversion. Since 2026-10-30 the first two are
// strict values read at Any (advice, design/strict-fixer.md); the lint and the translator refuse the cast, first.
export function asCount(s: string): number {
  return (s as number) + 1;
}

export interface Keyed { key: string }
export interface Numbered { id: number }

export function idOf(x: Keyed | Numbered): number {
  return x.id;
}

export function nameOr(u: { name?: string }): string {
  return u.name;
}
