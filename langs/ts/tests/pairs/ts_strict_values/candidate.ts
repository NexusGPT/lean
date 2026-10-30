// Values a strict-mode error is about, read at the opaque Any: the error says the code never checked the value's type
// (a possibly absent value used as present, a value that may be absent filling a slot that may not, a member only some
// members of a union declare). Each family has a unit proved (the same read, written another way) and a unit
// witnessed (a rewrite that changes what the absent or other member gives). A member no type declares stays refused
// (fixtures/escapes/ts/strict_value_unchecked_own.ts).
type User = { name?: string; tag?: string; age: number };
type Circle = { kind: "circle"; r: number };
type Square = { kind: "square"; side: number };

// the same read through a local
export function longName(u: User): boolean { const n = u.name; return n.length === 3; }
// the absent tag now gives false where the parent throws
export function longTag(u: User): boolean { return u.tag === undefined ? false : u.tag.length === 3; }
// the same value, upper-cased into a local first
export function isAda(u: User): boolean { const t: string = u.name; const up = t.toUpperCase(); return up === "ADA"; }
// the absent tag now gives false where the parent throws
export function isAdaTag(u: User): boolean { const s: string = u.tag ?? ""; return s.toUpperCase() === "ADA"; }
// the same member read through a local
export function wide(s: Circle | Square): boolean { const shape = s; return shape.r === 1; }
// a circle now gives true where the parent compares undefined, false
export function long(s: Circle | Square): boolean { return s.kind === "square" ? s.side === 1 : true; }
