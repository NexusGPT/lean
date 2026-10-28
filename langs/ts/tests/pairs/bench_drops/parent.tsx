import { useStatus } from '@/status';
import { notify } from '@/settings';

// changed in the candidate: the threshold moves from > 3 to >= 3
export function warn(code: number): void {
  if (code > 3) notify('high');
  else notify('low');
}

// refactored in the candidate: the same choice as an if statement
export function label(code: number): string {
  return code > 3 ? 'high' : 'low';
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
  return <p>{status}</p>;
}
