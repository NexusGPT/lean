// a write in place through one name of an object another name holds shows through both (ECMA-262 23.1.3.23 push writes
// the one object): `const b = a; a.push(1)` grows b too. The value reading reads an object as a value, so it must not
// read such a write; the heap core (the sync units) reads it on the one object. The write happens on one input in a
// million (x * 7 % 1000003 === 5), so lane B bounds it and only lane A could tell: a proof here would be a false one.
export async function sourcePushed(x: number): Promise<number> { const a = [x]; const b = a; if (x * 7 % 1000003 === 5) a.push(1); return b.length; }
export function sourcePushedSync(x: number): number { const a = [x]; const b = a; if (x * 7 % 1000003 === 5) a.push(1); return b.length; }
export async function heldInRecord(x: number): Promise<number> { const a = [x]; const o = { xs: a }; if (x * 7 % 1000003 === 5) a.push(1); return o.xs.length; }
export async function heldEarlierTurn(xs: number[]): Promise<number> { const out: number[][] = []; const row: number[] = []; for (const v of xs) { if (v * 7 % 1000003 === 5) row.push(v); out.push(row); } return out.length > 0 ? out[0].length : 0; }
export async function copiedFirst(x: number): Promise<number> { const a = [x]; const b = [...a]; if (x * 7 % 1000003 === 5) a.push(1); return b.length; }
export async function writtenThenHeld(x: number): Promise<number> { const a = [x]; if (x * 7 % 1000003 === 5) a.push(1); const b = a; return b.length; }
export async function reboundFirst(x: number): Promise<number> { const a = [x]; let b = a; b = []; if (x * 7 % 1000003 === 5) b.push(1); return a.length; }
export async function writtenBesideSlot(x: number): Promise<number> { const a = [x]; const o = { held: a, tag: '' }; o.tag = 'x'; return o.tag === 'x' ? a.length : 0; }
export async function writtenThroughSlot(x: number): Promise<number> { const a = [x]; const o = { xs: a }; if (x * 7 % 1000003 === 5) o.xs.push(1); return a.length; }
