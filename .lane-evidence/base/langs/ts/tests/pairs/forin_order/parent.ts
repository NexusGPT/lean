// for-in over a record the function makes: its keys in property order (design/forin-order.md)
export function keyOrder(x: number, y: number): string { const o = { a: x, b: y }; let s = ""; for (const k in o) s += k; return s; }
export function sameOrder(x: number, y: number): string { const o = { a: x, b: y }; let s = ""; for (const k in o) s += k; return s + o.a; }
export function indexFirst(x: number, y: number): string { const o = { b: x, 10: y, 2: x }; let s = ""; for (const k in o) s += k + ","; return s; }
export function written(x: number): string { const o = { a: 0, b: x }; o.a = x + 1; let s = ""; for (const k in o) s += k; return s + o.a; }
export function inHeader(x: number): string { let s = ""; for (const k in { z: x, y: 1 }) s += k; return s; }
export function withKeys(x: number, y: number): string { const o = { a: x, b: y }; let s = Object.keys(o).join(""); for (const k in o) s += k; return s; }
export function viaDict(x: number, y: number): string { const d: Record<string, number> = { a: x, b: y }; let s = ""; for (const k in d) s += k; return s; }
export function bothSame(x: number, y: number): string { const o = { a: x, b: y }; let s = Object.keys(o).join(""); for (const k in o) s += k; return s; }
export function untouched(x: number): number { return x + 1; }
