// for-in over a record the function makes: its keys in property order (design/forin-order.md)
export function keyOrder(x: number, y: number): string { const o = { b: y, a: x }; let s = ""; for (const k in o) s += k; return s; }
export function sameOrder(x: number, y: number): string { const r = { a: x, b: y }; let s = ""; for (const k in r) s += k; return s + r.a; }
export function indexFirst(x: number, y: number): string { const o = { 2: x, b: x, 10: y }; let s = ""; for (const k in o) s += k + ","; return s; }
export function written(x: number): string { const o = { b: x, a: 0 }; o.a = x + 1; let s = ""; for (const k in o) s += k; return s + o.a; }
export function inHeader(x: number): string { let s = ""; for (const k in { y: 1, z: x }) s += k; return s; }
export function withKeys(x: number, y: number): string { const o = { b: y, a: x }; let s = Object.keys(o).join(""); for (const k in o) s += k; return s; }
export function viaDict(x: number, y: number): string { const d: Record<string, number> = { b: y, a: x }; let s = ""; for (const k in d) s += k; return s; }
export function bothSame(x: number, y: number): string { const r = { a: x, b: y }; let s = Object.keys(r).join(""); for (const k in r) s += k; return s; }
export function untouched(x: number): number { return x + 1; }
