// stage 5 step 14: the pure globals Math.max, Math.min, Math.abs, Math.floor, String, Array.isArray and Object.keys
// of a dictionary, each a function of its arguments
export interface Stock { low: number; high: number; count: number; label: string; prices: number[]; notes: Record<string, string> }

export function spread(s: Stock): number {
  return Math.abs(s.high - s.low);
}

export function half(s: Stock): number {
  return Math.floor(s.count / 3);
}

export function title(s: Stock): string {
  return `${s.count} ${s.label}`;
}

export function distance(s: Stock): number {
  return Math.abs(s.high - s.low);
}

export function listed(s: Stock): boolean {
  return true;
}

export function noteCount(s: Stock): number {
  return Object.keys(s.notes).length;
}
