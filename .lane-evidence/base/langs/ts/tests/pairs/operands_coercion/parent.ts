// Explicit operands: loose equality between primitives follows the ECMAScript coercion table.
export function sameNumber(a: number, b: number): boolean { return a == b; }
export function mixed(x: number | string, y: string): boolean { return x == y; }
export function flagged(f: boolean | number, n: number): boolean { return f == n; }
export function absent(n: number | null): boolean { return n == undefined; }
