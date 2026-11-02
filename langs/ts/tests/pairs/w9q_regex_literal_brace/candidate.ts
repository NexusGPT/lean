export function iteratorLabel(s: string): string {
  if (/^Map Iterator] {$/.test(s)) return 'set';
  return 'other';
}

export function braceCount(s: string): number {
  if (/^x{2}y{1,2}$/.test(s)) return 3;
  return 0;
}
