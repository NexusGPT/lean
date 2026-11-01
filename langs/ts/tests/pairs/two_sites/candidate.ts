export function grade(n: number, s: string): string {
  if (n > 100) return 'huge';
  if (s.length > 3) return 'lengthy';
  return 'small';
}

export function half(x: number): number {
  return x / 2 + 1;
}
