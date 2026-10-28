import { label } from '@/where';

// the left operand dropped
export function commaDrop(n: number, total: number): number {
  let count = total;
  const last = (count = count * 2);
  return last;
}

// the operands swapped
export function commaSwap(n: number, total: number): number {
  let count = total;
  const last = ((count = count * 2), (count = count + n));
  return last;
}

// the last operand changed
export function commaLast(n: number, total: number): number {
  let count = total;
  const last = ((count = count + n), (count = count * 3));
  return last;
}

// the sequence written as two statements: the same steps in the same order
export function commaSplit(n: number, total: number): number {
  let count = total;
  count = count + n;
  count = count * 2;
  const last = count;
  return last;
}

export function untouched(n: number, total: number): number {
  let count = total;
  const last = ((count = count - n), count + 1);
  return last;
}

// one string literal changed beside the aliased call
export function aliasTag(s: string): { tag: string; text: string } {
  const tag = label(s);
  return { tag, text: s + ';' };
}
