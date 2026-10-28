// expect: non-null-assertion
// `x!` on a value whose type admits undefined: at run time the absent value flows on, or a read through it throws;
// the proof lane would read it as some value of the type, so it is refused. Test the value or give it a default.
export interface User { name?: string }

export function nameLength(u: User): number {
  return u.name!.length;
}
