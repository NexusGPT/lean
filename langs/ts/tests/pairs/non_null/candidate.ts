// non_null: candidates that differ only when the name is absent
export interface User { name?: string; age: number }

// undefined becomes "undefined": a different value on the absent input
export function nameOf(u: User): string {
  return u.name! + "";
}

// 0 where the parent throws
export function nameLength(u: User): number {
  return u.name?.length ?? 0;
}

// untouched
export function ageOf(u: User): number {
  return u.age;
}
