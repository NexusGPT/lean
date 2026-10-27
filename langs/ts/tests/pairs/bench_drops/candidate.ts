import { notify } from '@/settings';

// changed in the candidate: the threshold moves from > 3 to >= 3
export function warn(code: number): void {
  if (code >= 3) notify('high');
  else notify('low');
}

// refactored in the candidate: the same choice as an if statement
export function label(code: number): string {
  if (code > 3) return 'high';
  return 'low';
}

// untouched
export function twice(n: number): number {
  return n * 2;
}
