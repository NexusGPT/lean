// expect: signed-zero
// -x of a zero is -0 (ECMA-262 6.1.6.1.1); the exact reading holds -0 and 0 as one value, so `0 - x` would read alike
export function negated(x: number): number { return -x; }
