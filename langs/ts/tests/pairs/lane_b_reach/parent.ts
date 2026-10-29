// lane B's representation families (design/lane-b-reach.md): in each unit the two versions agree on every plain value
// of the declared type and differ on one runtime form the type admits and does not name; lane B separates each with
// that family alone (LEAN_REACH=<family>) and with none of them (LEAN_REACH=none) finds no difference
const ONE = { x: 1 };
const PAIR = { x: 1, y: 2 };
// extra-key: an own key the type does not declare
export function extraKey(a: typeof PAIR): number { return Object.getOwnPropertyNames(a).filter((k) => !(k in PAIR)).length; }
// inherited-key: `in` sees the prototype, Object.hasOwn does not
export function inheritedKey(a: { x?: number }): boolean { return 'x' in a; }
// accessor-key: a write to a field held by a getter throws in strict code
export function accessorKey(a: { x: number }): number { a.x = a.x; return a.x; }
// non-enumerable-key: Object.keys skips a field that is not enumerable, Object.getOwnPropertyNames does not
export function nonEnumerableKey(a: typeof ONE): number { return Object.keys(a).length; }
// symbol-key: a spread copies an own symbol key
export function symbolKey(a: typeof ONE): number { return Reflect.ownKeys({ ...a }).length; }
// null-prototype: an object with no prototype is no instance of Object
export function nullPrototype(a: typeof ONE): boolean { return a instanceof Object; }
// proto-name-key: `in` finds Object.prototype's members on a dictionary the caller passes
export function protoNameKey(d: Record<string, number>, k: string): boolean { return k in d; }
// sparse-array: forEach skips a hole, length counts it
export function sparseArray(xs: number[]): number { let c = 0; xs.forEach(() => { c++; }); return c; }
// array-extra-property: for-in visits an own key beside the indices
export function arrayExtraProperty(xs: number[]): number { let c = 0; for (const k in xs) { if (!/^\d+$/.test(k)) c++; } return c; }
// shared-reference: two arguments of one shape may be one object (the enumerated heaps already draw it; the family draws it on every turn of its own)
export function sharedReference(a: { n: number }, b: { n: number }): number { a.n = 1; b.n = 2; return a.n; }
// coercion-hooks: a value of an unread type converts itself; `+` asks for the default hint, Number for a number
export function coercionHooks(x: any): number { return x + 1; }
// thenable: an awaited value may have `then` and no `catch`
export async function thenable(p: Promise<number>): Promise<number> { return p.catch(() => 0); }
// settlement-order: the caller settles its promises in any order; Promise.race sees it
export async function settlementOrder(a: Promise<number>, b: Promise<number>): Promise<number> { return Promise.race([a, b]); }
// timer-order: a timeout and an immediate due at one instant may fire in either order
export function timerOrder(box: { v: string }): void { setTimeout(() => { box.v = 't'; }, 0); setImmediate(() => { box.v = 'i'; }); }
// the same text on both sides
export function untouched(a: { x: number }, xs: number[]): number { return a.x + xs.length; }
