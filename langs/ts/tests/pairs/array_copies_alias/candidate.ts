// a write in place through one name of an object another name holds shows through both (ECMA-262 23.1.3.23 push writes
// the one object): `const b = a; a.push(1)` grows b too. The value reading reads an object as a value, so it must not
// read such a write; the heap core (the sync units) reads it on the one object. The write happens on one input in a
// million (x * 7 % 1000003 === 5), so lane B bounds it and only lane A could tell: a proof here would be a false one.
export async function sourcePushed(x: number): Promise<number> { return 1; }
export function sourcePushedSync(x: number): number { return 1; }
export async function heldInRecord(x: number): Promise<number> { return 1; }
export async function heldEarlierTurn(xs: number[]): Promise<number> { return 0; }
export async function copiedFirst(x: number): Promise<number> { return 1; }
export async function writtenThenHeld(x: number): Promise<number> { const a = [x]; const n = x * 7 % 1000003 === 5 ? 2 : 1; return n; }
export async function reboundFirst(x: number): Promise<number> { return 1; }
export async function writtenBesideSlot(x: number): Promise<number> { return 1; }
export async function writtenThroughSlot(x: number): Promise<number> { return 1; }
