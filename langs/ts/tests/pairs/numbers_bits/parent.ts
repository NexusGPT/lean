export function flags(x: number): number { return (x & 3) | 4; }
export function coerce(x: number): number { return x | 0; }
export function zeroGuard(x: number): number {
  if (x === 0) return 0;
  return 0.0 / x;
}
export function untouched(x: number): number { return x + 1; }
export function unsigned(x: number): number { return x >>> 0; }
export function negativeZero(): number { return -0; }
export function infinitySign(): number { return Number.POSITIVE_INFINITY; }
export function nanTest(): boolean { return Number.isNaN(Number.NaN); }
export function booleanNumber(x: boolean): number { return +x; }
export function numericIdentity(x: number): number { return +x; }
export function rounded(): number { return Math.round(-1.5); }
export function truncated(): number { return Math.trunc(-1.7); }
export function realRemainder(): number { return -5.5 % 2.0; }
export function parsePrefix(x: string): number { return parseInt(x, 10); }
export function stringNumber(x: string): number { return +x; }
export function divide(x: number): number { return 0.0 / x; }
export function observeDivide(x: number): boolean { const n = divide(x); return n === n; }
const moduleSpecial = Number.NaN;
export function observeModule(): boolean { return moduleSpecial === moduleSpecial; }
export function parseNumeric(): number { return parseInt(1e21 as any, 10); }
