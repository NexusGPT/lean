import type { Cursor, Sink } from './ports';
export function temporaryNames(ov0_: number, ov1_: number): number { return 5 + ov0_ + ov1_; }
export function cursor(it: Cursor, limit: number): number {
  let c: number | null = null;
  let remaining = limit;
  let total = 0;
  // @decreases if remaining > 0 then remaining else 0
  while ((c = it.next()) !== null && c !== 0) {
    if (remaining <= 0) break;
    total += c;
    remaining -= 1;
  }
  return total;
}
export function indexed(arr: number[]): number {
  if (arr.length === 0) return -1;
  let i = 0;
  const v = arr[i];
  i += 1;
  return v + i;
}
export function arithmetic(n: number): number { return n * 4 + 4; }
export function order(n: number): number {
  let i = n;
  return i++ + i;
}
export function chained(n: number): number {
  let a = n; let b = n;
  b = 0; a = b;
  const v = a;
  return a + b + v;
}
export function compound(n: number): number {
  let i = n;
  const old = i;
  i += 1;
  i = old + old;
  const v = i;
  return v + i;
}
export function sequence(sink: Sink, n: number): number {
  let i = n;
  const old = i;
  i += 1;
  sink.put(old, old);
  i += 2;
  return i;
}
export function path(r: { n: number }): number {
  const old = r.n;
  r.n += 1;
  return old;
}
export function argumentsInOrder(sink: Sink, n: number): number {
  let i = n;
  const old = i;
  i += 1;
  return sink.put(old, old);
}
export function assignedTest(it: Cursor): number {
  let c: number | null = null;
  c = it.next();
  if (c !== null) return c;
  return -1;
}
export class Counter {
  count: number = 0;
  reset(): void { this.count = 0; }
  take(): number { return this.count; }
  prefix(): number { const value = this.count + 1; this.count = value; return value; }
  compound(): number { const value = this.count * 2; this.count = value; return value; }
}
export function untouched(n: number): number { return n + 1; }
export function optionalAssigned(it: Cursor): number {
  const c = it.next();
  return c ?? it.next() ?? -1;
}
export function localPostfix(n: number): number { let count = n; return count; }
export function mixedTruth(x: number | string | null): number { return x ? 1 : 0; }
export function assignedTernary(it: Cursor): number {
  const c = it.next();
  if (c !== null) return c;
  return -1;
}
export class Receiver { n: number = 0; value(x: number): number { return this.n + x; } }
export async function awaitedReceiver(first: Receiver, second: Receiver): Promise<number> {
  let receiver = first;
  const chosen = receiver;
  receiver = second;
  return await chosen.value(receiver.n);
}

let moduleCount = 0;
export function modulePostfix(): number { const old = moduleCount; moduleCount = old + 1; return old; }

export function assignedAbsence(x: number | null | undefined): boolean { let value: number | null | undefined = x; return value === null; }

export function assignedTruth(x: number | null | undefined): number { if (x) return 1; return 0; }

export function assignedCoalesce(x: number | null | undefined): number { return x ?? 4; }

export function assignedNullable(x: number | null): number | null | undefined { return x; }

export function assignedNull(): number | null | undefined { return null; }
