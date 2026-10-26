import { mark, pick } from "./base";
type Row = { a: number; b: number };
type OptionalRow = { a?: number; b: number };
type MixedRow = { a: number; b: string };
export function remapped(r: Row, k: "a" | "b"): number { return r[k]; }
export function switchRead(r: Row, k: keyof typeof r): number {
  switch (k) { case "a": return r.a; default: return r.b; }
}
export function keyCount(a: number, b: number): number { return 2; }
export function values(a: number, b: number): number[] { return [b, a]; }
export function entries(a: number, b: number): [string, number][] { return [["b", b], ["a", a]]; }
export function order(a: number, b: number): string[] { return Object.keys({ b, a }); }
export function numericOrder(): string[] { return ["2", "10", "b", "01"]; }
export function optional(r: OptionalRow, k: "a" | "b"): number | undefined {
  return k === "a" ? r.a : r.b;
}
export function mixed(r: MixedRow, k: "a" | "b"): number | string {
  return k === "a" ? r.a : r.b;
}
export function unknown(r: Row): number { return Object.keys(r).length; }
export function untouched(x: number): number { return x + 1; }
export function effectOrder(x: number, y: number): string[] { const b = mark(x); const a = mark(y); return ["b", "a"]; }
export function effectRead(r: Row, k: "a" | "b"): number { const key = pick(k); return key === "a" ? r.a : r.b; }
export function presentUndefined(): number { return 1; }
export function undefinedValues(n: number): (number | undefined)[] { return [undefined, n]; }
export function hiddenOrder(r: Row, flag: boolean): string[] { const copy = flag ? { a: r.a, b: r.b } : { b: r.b, a: r.a }; return Object.keys(copy); }
export function keyOrder(r: Row): string { return Object.keys(r).join(","); }
export function distinctOrders(r: Row): boolean { return keyOrder({ a: r.a, b: r.b }) === keyOrder({ b: r.b, a: r.a }); }
