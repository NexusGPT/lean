// must-not-prove units: each pair of versions differs through one place where lane A gives both sides one shared
// unknown (or one exact reading JavaScript does not keep); lane A must not prove any of them (design/proof-hunt.md)
export type H = { accept: string; [k: string]: string | undefined };

// class 1: an open key on a record type with declared fields and a string index signature
export function openKey(h: H, k: string): string | undefined { const c: H = { accept: h.accept }; return c[k]; }
export function dotKey(h: H): string | undefined { const c: H = { accept: h.accept }; return c.other; }
export function inKey(h: H, k: string): boolean { const c: H = { accept: h.accept }; return k in c; }
export function keysH(h: H): number { const c: H = { accept: h.accept }; let n = 0; for (const k in c) n = n + 1; return n; }

// class 2: `x!` on an absent value
export function bang(x?: number): number { return x! + 0; }
export function bangS(x?: string): string { return x! + ""; }
export function bangType(x?: number): string { return "number"; }

// class 3: a dictionary read of an Object.prototype name
export function protoLit(d: Record<string, number>): number { return d["valueOf"] ?? 0; }
export function protoRead(d: Record<string, number>, k: string): number { const j = k === "toString" ? "valueOf" : k; return d[j] ?? 0; }

// class 4: a loop helper that runs on after a callee faults inside an array callback
function check(x: number): void { if (x < 0) throw new Error("negative"); }
export function lastOk(xs: number[]): number { if (xs.length > 0) check(xs[xs.length - 1]); return 1; }

// class 5: for-in over a record built in the unit (the key order and presence of its creation)
export function keyOrder(x: number, y: number): string { const o = { b: y, a: x }; let s = ""; for (const k in o) s += k; return s; }
export function keysOfParam(p: { a: number; b: number }): string { const q = { b: p.b, a: p.a }; let s = ""; for (const k in q) s += k; return s; }
export function optKeys(p: { a?: number; b: number }): string { const q = { a: p.a, b: p.b }; let s = ""; for (const k in q) s += k; return s; }

// class 6: a let read before any write (a definite-assignment assertion, a write only a closure makes)
export function definite(x: number): number { let v!: number; return v + 0; }
export function definiteS(x: number): string { let v!: string; return v + ""; }
export function lateInit(x: number): number { let v: number; const set = () => { v = x; }; if (x > 1000) set(); return v! + 0; }

// class 7: a module constant holding a function value, passed by name as a callback
function makeScale(k: number): (x: number) => number { return (x: number) => x * k; }
const scale = makeScale(3);
export function scaled(xs: number[]): number[] { return xs.map(scale); }

// class 8: the number envelope (exact int and real arithmetic, no signed zero)
export function negZero(x: number): number { return x === 0 ? 0 : x; }
export function bigInt(x: number): number { return x; }

// class 2, more positions: the absent value of a Map read and of a find, asserted present
export function mapGet(m: Map<string, number>, k: string): number { return m.get(k)! + 0; }
export function findBang(xs: number[]): number { return xs.find((x) => x > 5)! + 0; }

// class 7, called: the module constant's function value called directly
export function applied(x: number): number { return scale(x); }

// class 9: a module constant whose initializer calls a same-file function whose body changed
function make(k: number): { x: number } { return { x: k + 2 }; }
const CFG = make(1);
export function cfgX(y: number): number { return CFG.x + y; }

// class 10: a value of another runtime type asserted to T (an any narrowed, an `as` cast)
export function anyAs(x: any): number { const n: number = x; return n + 0; }
export function asCast(x: string | number): number { return (x as number) + 0; }
export function unknownAs(x: unknown): string { return (x as string) + ""; }

// closed on this base: kept so they stay closed
export function thrower(x: number): number { if (x > 0) throw new Error("b"); return x; }
export function dictTruth(d: Record<string, number>, k: string): number { return d[k] !== 0 ? 1 : 2; }
export function dictUndef(d: Record<string, number>, k: string): boolean { return false; }
export function entriesOrder(x: number, y: number): string { const o = { b: y, a: x }; return Object.keys(o).join(","); }
export function bangLen(x?: string): number { return (x ?? "").length; }

// untouched
export function same(x: number): number { return x + 1; }
