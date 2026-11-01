export function grade(n: number, s: string): string {
  if (n > 100) return 'big';
  if (s.length > 3) return 'long';
  return 'small';
}

export function half(x: number): number {
  return x / 2;
}
