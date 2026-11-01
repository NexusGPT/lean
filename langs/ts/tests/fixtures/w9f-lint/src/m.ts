export function f1(x: { n?: number }, y: string | number): number { return x.n! + (y as number); }
export function f2(a: number): number { return a * 2; }
export function f3(a: number): number { return a - 1; }
export function f4(s: string): string { return s.trim(); }
export function f5(a: number[]): number { return a.length; }
