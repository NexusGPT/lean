export function band(n: number, s: string): string {
  if (s.length < 4) return 'short';
  if (n > 1000) return 'high';
  if (n < -1000) return 'low';
  return 'mid';
}
