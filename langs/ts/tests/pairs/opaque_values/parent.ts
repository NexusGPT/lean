// a value that may be absent (design/opaque-values.md): an option whose definedness the flow carries; `x!` and an
// unchecked read are its payload only where the statement's test shows it present

// a let written only by a closure: absent unless the closure ran
export function lateInit(x: number): number { let v: number; const set = () => { v = x; }; if (x > 1000) set(); return v!; }
// the flow fixes the let before the read
export function flowFixed(x: number): number { let v: number; v = x * 2; return v!; }
// a definite-assignment assertion, written before the read on every path
export function definiteWritten(x: number): number { let v!: number; v = x + 1; return v; }
// a definite-assignment assertion, written on one path only
export function definiteLate(x: number): number { let v!: number; if (x > 3) v = x; return v; }
// `x!` on an optional parameter
export function optPlus(x?: number): number { return x! + 1; }
// a Map read held in a local, asserted present
export function mapAbsent(m: Map<string, number>, k: string): number { const g = m.get(k); return g!; }
// `x!` after the test that narrows it
export function narrowed(x?: number): number { if (x === undefined) return 0; return x! + 1; }
// a Map read and a find asserted present inside a statement that only reads: the operand is read once, tested, then its payload
export function mapPresent(x: number): number { const m = new Map<string, number>([["a", x]]); return m.get("a")! * 2; }
export function findPresent(x: number): number { const xs = [x, x + 1]; return xs.find((y) => y > x)! - x; }
export function mapDirect(m: Map<string, number>, k: string): number { return m.get(k)!; }
// untouched
export function plain(x: number): number { return x + 1; }
