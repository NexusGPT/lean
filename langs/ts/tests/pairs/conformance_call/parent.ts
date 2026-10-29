// a call on an object the unit did not make runs whatever that object holds: a request to the outside, with its
// argument values, whether or not its result is read (design/conformance-readings.md)
export class Reader { read(x: number): number { return x + 1; } }
export function readLocal(g: Reader, x: number): number { const v = g.read(x); return 42; }
export function readUsed(g: Reader, x: number): number { return g.read(x); }
export function builtRead(x: number): number { const g = new Reader(); return g.read(x); }
