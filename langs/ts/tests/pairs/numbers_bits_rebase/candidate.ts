let current = 6;
export function moduleNumber(): number { return Number.parseInt(String(current), 10); }
export function nullableDefault(x: number | null = 1): number { return x === null ? -1 : 1.0 / x; }
export function nullableOptional(x?: number | null): number { return x === null ? -1 : x === undefined ? 0 : 1.0 / x; }
export function nullBranch(x?: number | null): number { return x === null ? 3 : Number.parseFloat("2"); }
export function untouched(x: number): number { return x & 3; }
