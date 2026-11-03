export function lim(o: { limit?: string }): number { const v = parseInt(o.limit ?? "", 10); return v > 0 ? v : 1; }
