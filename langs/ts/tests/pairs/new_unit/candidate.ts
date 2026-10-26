export function runs(n: number): number { return n + 1; }
export function faults(n: number): number { throw new Error("intentional"); }
export class Added { value(n: number): number { return n; } }
