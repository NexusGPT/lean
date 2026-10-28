import { useStatus } from '@/status';
import { announce, notify } from '@/settings';

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

// a component whose hook starts work that settles after the render: unchanged in the candidate
export function Badge({ code }: { code: number }) {
  const status = useStatus(code);
  return <p>{status}</p>;
}

// a component whose text changes in the candidate
export function Tag({ code }: { code: number }) {
  const status = useStatus(code);
  return <p>tag {status}</p>;
}

// inlines the module's helper: the same calls, written in the unit
export function report(code: number): void {
  notify(code > 3 ? 'high' : 'low');
}

// changes its outcome beside the module: the returned label moves its threshold, the module is called the same way
export function level(code: number): string {
  notify('level');
  return code >= 3 ? 'high' : 'low';
}
