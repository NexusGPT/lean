// expect: ts-strict
// strict-mode errors that stay the unit's own, beside the ones read at Any (design/strict-fixer.md, 2026-10-30): a
// member no type of the receiver declares (TS2339 on a record, a name that does not resolve), and a value of another
// type in a slot (TS2322 that removing null and undefined does not cure). Neither names a value whose type the code
// merely left unconfirmed; each is a type error TypeScript reports without strict too.
type User = { name?: string; age: number };

export function nick(u: User): string {
  return u.nick;
}

export function years(u: User): string {
  const s: string = u.age;
  return s;
}
