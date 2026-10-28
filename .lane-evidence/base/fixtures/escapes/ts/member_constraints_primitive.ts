// expect: unsupported-member
// a type parameter constrained to a primitive declares no record member: read the primitive's own value (String(x).length)
export function len<T extends string>(x: T): number {
  return x.length;
}
