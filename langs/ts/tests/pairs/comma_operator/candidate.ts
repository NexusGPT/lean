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

class StopError extends Error {}

// the walk stops one step earlier
export function causeDepth(e: unknown): number {
  let depth = 0;
  for (let inner: unknown = e; inner instanceof Error && depth < 3; inner = inner.cause, depth++) {
    if (inner instanceof StopError) return -1;
  }
  return depth;
}

// the cause is never followed: the first message
export function rootMessage(e: Error): string {
  let cur: Error = e;
  for (let i = 0; i < 0; i++) {
    const next: unknown = cur.cause;
    if (!(next instanceof Error)) return cur.message;
    cur = next;
  }
  return cur.message;
}

// the guard dropped: every field is counted
export function countAllowed(fields: string[], allowed: string[]): { n: number } {
  return fields.reduce((acc, field) => {
    return (acc.n = acc.n + 1), acc;
  }, { n: 0 });
}

export function countKept(fields: string[], allowed: string[]): { n: number } {
  return fields.reduce((acc, field) => {
    if (!allowed.includes(field)) return acc;
    return (acc.n = acc.n + 1), acc;
  }, { n: 0 });
}
