// an array copy is a new array (ECMA-262 13.2.4.1 array spread, 23.1.3.1 concat): `===` against its source is false and
// a push on the copy does not show on the source, nor a push on the source on the copy. The async units are read by the
// value reading (the heap core takes no async unit), the sync ones by the heap core; the identity guard decides each.
export async function copyPushedA(a: number[], x: number): Promise<number[]> { const b = [...a]; b.push(x); return a; }
export function copyPushedS(a: number[], x: number): number[] { const b = [...a]; b.push(x); return a; }
export async function copyPushedBackA(a: number[], x: number): Promise<number[]> { const b = [...a]; b.push(x); return b; }
export async function spreadIdA(a: number[]): Promise<boolean> { const b = a; return b === a; }
export function spreadIdS(a: number[]): boolean { const b = a; return b === a; }
export async function spreadRoBackA(a: readonly number[]): Promise<readonly number[]> { return a; }
export async function spreadTupleBackA(t: [number, number]): Promise<[number, number]> { return t; }
export async function concatTupleBackA(t: [number, number]): Promise<number[]> { return t; }
export async function spreadBackA(a: number[]): Promise<number[]> { return a; }
export async function concatIdA(a: number[]): Promise<boolean> { const b = a; return b === a; }
export function concatIdS(a: number[]): boolean { const b = a; return b === a; }
export async function concatEmptyIdA(a: number[]): Promise<boolean> { const b = a; return b === a; }
export async function concatBackA(a: number[]): Promise<number[]> { return a; }
export async function copiesBothA(a: number[]): Promise<boolean> { const b = [...a]; return b === a; }
