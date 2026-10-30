// Values a strict-mode error is about, read at the opaque Any: the error says the code never checked the value's type
// (a possibly absent value used as present, a value that may be absent filling a slot that may not, a member only some
// members of a union declare). Each family has a unit proved (the same read, written another way) and a unit
// witnessed (a rewrite that changes what the absent or other member gives). A member no type declares stays refused
// (fixtures/escapes/ts/strict_value_unchecked_own.ts).
type User = { name?: string; tag?: string; age: number };
type Circle = { kind: "circle"; r: number };
type Square = { kind: "square"; side: number };

// possibly absent (TS18048): the read through the absent value
export function longName(u: User): boolean { return u.name.length === 3; }
export function longTag(u: User): boolean { return u.tag.length === 3; }
// assignability (TS2322, an absent value in a slot that cannot hold it)
export function isAda(u: User): boolean { const s: string = u.name; return s.toUpperCase() === "ADA"; }
export function isAdaTag(u: User): boolean { const s: string = u.tag; return s.toUpperCase() === "ADA"; }
// a member only one member of the union declares (TS2339)
export function wide(s: Circle | Square): boolean { return s.r === 1; }
export function long(s: Circle | Square): boolean { return s.side === 1; }
