export function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

export function clampMinMax(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}
