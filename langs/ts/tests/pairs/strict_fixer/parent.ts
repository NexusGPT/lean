// strict_fixer: a file with type errors under strict mode, as written; candidate.ts is what lean convert makes of it
export interface Address { city: string; zip?: string }
export interface User { name?: string; age: number; address?: Address }

// a possibly absent value read as a receiver (TS18048): listed, a person writes the narrowing
export function nameLength(u: User): number {
  return u.name.length;
}

// a possibly absent record read through (TS18048): listed, a person writes the narrowing
export function cityOf(u: User): string {
  return u.address.city.toUpperCase();
}

// a parameter typed any by inference: the annotation writes the type its uses need
export function scaled(x, k: number): number {
  return x * k + 1;
}

// a local written any: the annotation writes the type of what is assigned to it
export function label(u: User): string {
  const n: any = u.age;
  return "age " + n;
}

// a cast the compiler rejects (TS2352): a migration, listed and never applied
export function asCount(s: string): number {
  return (s as number) + 1;
}
