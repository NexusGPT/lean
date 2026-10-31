// the pure globals (design/heap-stage5.md section 14): Math, Number and JSON, one unit each, each a function of its
// arguments; Number(s) of a string stays out (NaN)
export interface Row { low: number; high: number; count: number; ratio: number; label: string; text: string; whole: boolean }

export function widest(r: Row): number {
  return Math.max(r.low, r.high, r.count);
}

export function lowest(r: Row): number {
  return Math.min(r.low, r.high, r.count);
}

export function gap(r: Row): number {
  return Math.abs(r.high - r.low);
}

export function trend(r: Row): number {
  return Math.sign(r.high);
}

export function ceiling(r: Row): number {
  return Math.ceil(r.ratio * 1.5);
}

export function nearest(r: Row): number {
  return Math.round(r.ratio);
}

export function chopped(r: Row): number {
  return Math.trunc(r.ratio);
}

export function halves(r: Row): number {
  return Math.floor(r.count / 2);
}

export function caption(r: Row): string {
  return String(r.count) + " " + r.label;
}

export function root(r: Row): number {
  return Math.sqrt(r.count);
}

export function asCount(r: Row): number {
  return Number(r.count);
}

export function isWhole(r: Row): void {
  r.whole = Number.isInteger(r.count);
}

export function finite(r: Row): boolean {
  return Number.isFinite(r.count);
}

export function quote(r: Row): void {
  r.text = JSON.stringify(r.label);
}

export function encodeCount(r: Row): string {
  return JSON.stringify(r.count);
}

export function stamp(a: Row, b: Row): void {
  a.text = JSON.stringify(b.label);
  a.whole = Number.isSafeInteger(b.count);
}

export function parsed(r: Row): number {
  return Number(r.label);
}
