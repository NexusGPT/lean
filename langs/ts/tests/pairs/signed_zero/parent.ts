// the sign of zero (ECMA-262 6.1.6.1): -0 and 0 are one value to ===, String and JSON, and two to Object.is and to a division
export function normalized(x: number): number { return x; }
export function negated(x: number): number { return -x; }
export function timesZero(x: number): number { return x * 0; }
export function magnitude(x: number): number { return Math.abs(x); }
export function plusZero(x: number): number { return x + 0; }
export function doubled(x: number): number { return x * 2; }
export function positive(n: number): number { return n > 0 ? n : 1; }
export function untouched(a: number, b: number): number { return a + b; }
