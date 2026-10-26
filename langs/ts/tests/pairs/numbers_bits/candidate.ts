export function flags(x: number): number { return (x & 3) | 8; }
export function coerce(x: number): number { return ~~x; }
export function zeroGuard(x: number): number {
  return 0.0 / x;
}
export function untouched(x: number): number { return x + 1; }
export function unsigned(x: number): number { return x >>> 32; }
export function negativeZero(): number { return 0; }
export function infinitySign(): number { return Number.NEGATIVE_INFINITY; }
export function nanTest(): boolean { return false; }
export function booleanNumber(x: boolean): number { return Number(x); }
export function numericIdentity(x: number): number { return Number(x); }
export function rounded(): number { return -1; }
export function truncated(): number { return -1; }
export function realRemainder(): number { return -1.5; }
export function parsePrefix(x: string): number { return parseInt(x, 10); }
export function stringNumber(x: string): number { return +x; }
export function divide(x: number): number { return 1.0 / x; }
export function observeDivide(x: number): boolean { const n = divide(x); return n === n; }
const moduleSpecial = Number.POSITIVE_INFINITY;
export function observeModule(): boolean { return moduleSpecial === moduleSpecial; }
export function parseNumeric(): number { return Math.trunc(1e21); }
