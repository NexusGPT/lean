// the pure globals (design/heap-stage5.md section 14): Math, Number and JSON, one unit each, each a function of its
// arguments; Number(s) of a string stays out (NaN)
export interface Row { low: number; high: number; count: number; ratio: number; label: string; text: string; whole: boolean }

export function widest(r: Row): number {
  return Math.max(r.count, Math.max(r.low, r.high));
}

export function lowest(r: Row): number {
  return Math.min(Math.min(r.low, r.high), r.count);
}

export function gap(r: Row): number {
  return Math.abs(-(r.high - r.low));
}

export function trend(r: Row): number {
  return -Math.sign(-r.high);
}

export function ceiling(r: Row): number {
  return -Math.floor(-(r.ratio * 1.5));
}

export function nearest(r: Row): number {
  return Math.floor(r.ratio + 0.5);
}

export function chopped(r: Row): number {
  return r.ratio < 0 ? Math.ceil(r.ratio) : Math.floor(r.ratio);
}

export function halves(r: Row): number {
  return Math.floor(r.count * 0.5);
}

export function caption(r: Row): string {
  return `${r.count} ${r.label}`;
}

export function root(r: Row): number {
  const s = Math.sqrt(r.count);
  return s;
}

export function asCount(r: Row): number {
  return r.count;
}

export function isWhole(r: Row): void {
  const w = Number.isInteger(r.count);
  r.whole = w;
}

export function finite(r: Row): boolean {
  return Number.isFinite(r.ratio);
}

export function quote(r: Row): void {
  const q = JSON.stringify(r.label);
  r.text = q;
}

export function encodeCount(r: Row): string {
  return JSON.stringify(r.count) + "";
}

export function stamp(a: Row, b: Row): void {
  a.whole = Number.isSafeInteger(b.count);
  a.text = JSON.stringify(b.label);
}

export function parsed(r: Row): number {
  return +r.label;
}
