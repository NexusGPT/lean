export function andBits(a: number, b: number): number { return a & b; }
export function orBits(a: number, b: number): number { return a | b; }
export function xorBits(a: number, b: number): number { return a ^ b; }
export function notBits(a: number): number { return ~a; }
export function shiftLeft(a: number, b: number): number { return a << b; }
export function shiftRight(a: number, b: number): number { return a >> b; }
export function shiftUnsigned(a: number, b: number): number { return a >>> b; }
export function floorQuotient(a: number): number { return Math.floor(a / 2); }
export function truncQuotient(a: number): number { return Math.trunc(a / 2); }
export function hexMask(): number { return 0xffffffff & 0x80000000; }
export function safeInteger(): number { return Number.MAX_SAFE_INTEGER; }
export function fractional(): number { return 0.5; }
export function ceilNumber(a: number): number { return Math.ceil(a); }
export function roundNumber(a: number): number { return Math.round(a); }
export function truncNumber(a: number): number { return Math.trunc(a); }
export function signNumber(a: number): number { return Math.sign(a); }
export function remainder(a: number): number { return a % 2.5; }
