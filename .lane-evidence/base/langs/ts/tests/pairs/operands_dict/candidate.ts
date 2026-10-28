// Explicit operands: a dictionary read states its missing-key result.
export function weight(d: Record<string, number>, k: string): number { return d[k] ?? 0; }
export function has(d: Record<string, number>, k: string): boolean { return k in d; }
