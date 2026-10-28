// non_null: `x!` on a value that may be absent checks nothing at run time; the proof lane refuses it (non-null-assertion)
export interface User { name?: string; age: number }

// the absent value flows on: undefined is returned
export function nameOf(u: User): string {
  return u.name!;
}

// the read through it throws a TypeError when the name is absent
export function nameLength(u: User): number {
  return u.name!.length;
}

// no assertion: inside the subset
export function ageOf(u: User): number {
  return u.age;
}
