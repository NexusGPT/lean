// an array copy is a new array (ECMA-262 13.2.4.1 array spread, 23.1.3.28 slice, 23.1.2.1 Array.from, 23.1.3.1 concat
// each make a new object): `===` against its source is false and a push on one does not show on the other. An async
// unit is read by the value reading (the heap core takes no async unit), where a copy's text may be its source's.
export async function spreadSame(a: number[]): Promise<boolean> { const b = a; return b === a; }
export async function sliceSame(a: number[]): Promise<boolean> { const b = a; return b === a; }
export async function fromSame(a: number[]): Promise<boolean> { const b = a; return b === a; }
export async function concatSame(a: number[]): Promise<boolean> { const b = a; return b === a; }
export async function spreadBack(a: number[]): Promise<number[]> { return a; }
export async function bothCopied(a: number[]): Promise<boolean> { const b = [...a]; return b === a; }
