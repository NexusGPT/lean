import { label } from '@/where';

// a comma expression in a value context: the left operand runs, the right operand is the value
export function commaDrop(n: number, total: number): number {
  let count = total;
  const last = ((count = count + n), (count = count * 2));
  return last;
}

export function commaSwap(n: number, total: number): number {
  let count = total;
  const last = ((count = count + n), (count = count * 2));
  return last;
}

export function commaLast(n: number, total: number): number {
  let count = total;
  const last = ((count = count + n), (count = count * 2));
  return last;
}

export function commaSplit(n: number, total: number): number {
  let count = total;
  const last = ((count = count + n), (count = count * 2));
  return last;
}

export function untouched(n: number, total: number): number {
  let count = total;
  const last = ((count = count - n), count + 1);
  return last;
}

// a unit of a file that imports through the alias: the module's load fails, it is the environment's module on both sides
export function aliasTag(s: string): { tag: string; text: string } {
  const tag = label(s);
  return { tag, text: s + ':' };
}
