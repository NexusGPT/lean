export function lim(o: { limit?: string }): number { const v = Number(o.limit); return v > 0 ? v : 1; }
