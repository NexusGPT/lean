// strict_fixer: a near rewrite that changes behaviour: `?.` with a default where the converter writes `!`
export interface Address { city: string; zip?: string }
export interface User { name?: string; age: number; address?: Address }

// a possibly absent value read as a receiver (TS18048): the guard writes `!`
export function nameLength(u: User): number {
  return u.name?.length ?? 0;
}

// a possibly absent record read through (TS18048): the guard writes `!`
export function cityOf(u: User): string {
  return u.address!.city.toUpperCase();
}

// a parameter typed any by inference: the annotation writes the type its uses need
export function scaled(x: number, k: number): number {
  return x * k + 1;
}

// a local written any: the annotation writes the type of what is assigned to it
export function label(u: User): string {
  const n: number = u.age;
  return "age " + n;
}

// a cast the compiler rejects (TS2352): a migration, listed and never applied
export function asCount(s: string): number {
  return (s as number) + 1;
}
