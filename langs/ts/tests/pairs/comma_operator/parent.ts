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

class StopError extends Error {}

// an error read through its cause chain: the loop walks `.cause` while the value is an Error, at most four steps
export function causeDepth(e: unknown): number {
  let depth = 0;
  for (let inner: unknown = e; inner instanceof Error && depth < 4; inner = inner.cause, depth++) {
    if (inner instanceof StopError) return -1;
  }
  return depth;
}

// the message at the end of the chain, from a parameter declared Error
export function rootMessage(e: Error): string {
  let cur: Error = e;
  for (let i = 0; i < 8; i++) {
    const next: unknown = cur.cause;
    if (!(next instanceof Error)) return cur.message;
    cur = next;
  }
  return cur.message;
}
