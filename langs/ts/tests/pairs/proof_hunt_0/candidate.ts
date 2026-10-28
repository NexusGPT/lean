// controls: must-not-prove units lane A does not prove on the base 1e55e21, and one untouched unit (design/proof-hunt.md)
// kept so they stay unproved

// closed on this base: kept so they stay closed
export function thrower(x: number): number { if (x > 0) throw new Error("b"); return x; }
export function dictTruth(d: Record<string, number>, k: string): number { return d[k] !== 0 ? 1 : 2; }
export function dictUndef(d: Record<string, number>, k: string): boolean { return false; }
export function entriesOrder(x: number, y: number): string { const o = { b: y, a: x }; return Object.keys(o).join(","); }
export function bangLen(x?: string): number { return (x ?? "").length; }

// untouched
export function same(x: number): number { return x + 1; }
