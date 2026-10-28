// Explicit operands: a dictionary read states its missing-key result.
export function weight(d: Record<string, number>, k: string): number { const v = d[k]; return v === undefined ? 0 : v; }
export function has(d: Record<string, number>, k: string): boolean { return d[k] !== undefined; }
