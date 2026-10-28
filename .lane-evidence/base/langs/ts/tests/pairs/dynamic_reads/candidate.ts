import { mark, pick } from "./base";
type Row = { a: number; b: number };
type OptionalRow = { a?: number; b: number };
type MixedRow = { a: number; b: string };
export function remapped(r: Row, k: "a" | "b"): number { return r[k === "a" ? "b" : "a"]; }
export function switchRead(r: Row, k: keyof typeof r): number { return r[k]; }
export function keyCount(a: number, b: number): number { const r = { b, a }; return Object.keys(r).length; }
export function values(a: number, b: number): number[] { return Object.values({ b, a }); }
export function entries(a: number, b: number): [string, number][] { return Object.entries({ b, a }); }
export function order(a: number, b: number): string[] { return Object.keys({ a, b }); }
export function numericOrder(): string[] { return Object.keys({ b: 0, 10: 0, 2: 0, "01": 0 }); }
export function optional(r: OptionalRow, k: "a" | "b"): number | undefined { return r[k]; }
export function mixed(r: MixedRow, k: "a" | "b"): number | string { return r[k]; }
export function unknown(r: Row): number { return Object.keys(r).length; }
export function untouched(x: number): number { return x + 1; }
export function effectOrder(x: number, y: number): string[] { return Object.keys({ b: mark(x), a: mark(y) }); }
export function effectRead(r: Row, k: "a" | "b"): number { const key = pick(k); return r[key]; }
export function presentUndefined(): number { return Object.keys({ missing: undefined }).length; }
export function undefinedValues(n: number): (number | undefined)[] { return Object.values({ missing: undefined, n }); }
export function hiddenOrder(r: Row, flag: boolean): string[] { const copy = flag ? { b: r.b, a: r.a } : { a: r.a, b: r.b }; return Object.keys(copy); }
export function keyOrder(r: Row): string { return Object.keys(r).join(","); }
export function distinctOrders(r: Row): boolean { return true; }
