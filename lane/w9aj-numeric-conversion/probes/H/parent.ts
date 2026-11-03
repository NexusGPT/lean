export function frame(k: string): number { const f = parseFloat(k); return isNaN(f) ? -1 : f; }
