// The `in` refusal follows a made prototype: a unit an object with another prototype can reach keeps the refusal, every
// other unit of the file reads `k in o` on a plain object (an own key or a name of Object.prototype).
export type Bag = Record<string, number>;
export interface Box { n: number }

// the maker: a dictionary without a prototype (refused, `prototype`)
function bare(): Bag { return Object.create(null) as Bag; }
// one call away: hands the maker's object to its caller
function fresh(): Bag { return bare(); }
// the object returned by the maker two calls away: `in` there is refused
export function seeded(k: string): boolean { const d = fresh(); return k in d; }
// a unit that receives the made object: `in` there is refused
function has(d: Bag, k: string): boolean { return k in d; }
export function lookup(k: string): boolean { return has(bare(), k); }
// a write through a key that may be '__proto__' changes the caller's object (refused, `prototype`)
function put(d: Record<string, Box>, k: string): void { d[k] = { n: 1 }; }
// the caller whose object put may change: `in` there is refused
export function filled(k: string): boolean { const d: Record<string, Box> = {}; put(d, k); return 'x' in d; }

// an unrelated local record: the made objects never reach it, so `in` keeps its reading
export function known(k: string): number { const r: Bag = { a: 1, b: 2 }; return k in r ? 1 : 0; }
// a name of Object.prototype on an unrelated local record: true here, an own key in the candidate
export function inherited(n: number): boolean { const r: Bag = { a: n }; return 'toString' in r; }
// untouched: a dictionary from the caller, which no made object reaches
export function hit(d: Bag, k: string): boolean { return k in d; }
