export function band(n: number, s: string): string {
  if (s.length < 4) return 'small';
  if (n > 1000) return 'big';
  if (n < -1000) return 'neg';
  return 'mid';
}
