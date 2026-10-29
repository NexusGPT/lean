export function andBits(a: number, b: number): number { return a & b; }
export function orBits(a: number, b: number): number { return a | b; }
export function xorBits(a: number, b: number): number { return a ^ b; }
export function notBits(a: number): number { return ~a; }
export function shiftLeft(a: number, b: number): number { return a << b; }
export function shiftRight(a: number, b: number): number { return a >> b; }
export function shiftUnsigned(a: number, b: number): number { return a >>> b; }
export function floorQuotient(a: number): number { return Math.floor(a / 2); }
export function truncQuotient(a: number): number { return Math.trunc(a / 2) + 0; } // + 0 turns a -0 into 0: a -0 result is read opaque (design/signed-zero.md), and the helper must keep a body to run
export function hexMask(): number { return 0xffffffff & 0x80000000; }
export function safeInteger(): number { return Number.MAX_SAFE_INTEGER; }
