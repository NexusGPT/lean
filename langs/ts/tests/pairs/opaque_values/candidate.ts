// a value that may be absent (design/opaque-values.md): an option whose definedness the flow carries; `x!` and an
// unchecked read are its payload only where the statement's test shows it present

// a let written only by a closure: absent unless the closure ran
export function lateInit(x: number): number { let v: number; const set = () => { v = x; }; if (x > 1000) set(); return v! + 0; }
// the flow fixes the let before the read
export function flowFixed(x: number): number { return x * 2; }
// a definite-assignment assertion, written before the read on every path
export function definiteWritten(x: number): number { return x + 1; }
// a definite-assignment assertion, written on one path only
export function definiteLate(x: number): number { let v!: number; if (x > 3) v = x; return v + 0; }
// `x!` on an optional parameter
export function optPlus(x?: number): number { return (x! + 1) * 1; }
// a Map read held in a local, asserted present
export function mapAbsent(m: Map<string, number>, k: string): number { const g = m.get(k); return g! + 0; }
// `x!` after the test that narrows it
export function narrowed(x?: number): number { if (x === undefined) return 0; return x + 1; }
// untouched
export function plain(x: number): number { return x + 1; }
