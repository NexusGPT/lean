// the sign of zero (ECMA-262 6.1.6.1): -0 and 0 are one value to ===, String and JSON, and two to Object.is and to a division
export function normalized(x: number): number { return x === 0 ? 0 : x; }
export function magnitude(x: number): number { return x < 0 ? -x : x; }
export function plusZero(x: number): number { return x; }
export function doubled(x: number): number { return x + x; }
export function positive(n: number): number { return n >= 1 ? n : 1; }
export function flipped(n: number): number { return n >= 1 ? 0 - n : 1; }
export function untouched(a: number, b: number): number { return a + b; }
