import type { Cursor, Sink } from './ports';
export function temporaryNames(ov0_: number, ov1_: number): number { let i = 5; return i++ + ov0_ + ov1_; }
export function cursor(it: Cursor, limit: number): number {
  let c: number | null = null;
  let remaining = limit;
  let total = 0;
  // @decreases if remaining > 0 then remaining else 0
  while ((c = it.next()) !== null) {
    if (remaining <= 0) break;
    total += c;
    remaining -= 1;
  }
  return total;
}
export function indexed(arr: number[]): number {
  if (arr.length === 0) return -1;
  let i = 0;
  const v = arr[i++];
  return v + i;
}
export function arithmetic(n: number): number {
  let i = n;
  return i + i++ + ++i + i--;
}
export function order(n: number): number {
  let i = n;
  return i + i++;
}
export function chained(n: number): number {
  let a = n; let b = n;
  const v = (a = b = 0);
  return a + b + v;
}
export function compound(n: number): number {
  let i = n;
  const v = (i += i++);
  return v + i;
}
export function sequence(sink: Sink, n: number): number {
  let i = n;
  return (sink.put(i, i++), i += 2, i);
}
export function path(r: { n: number }): number {
  return r.n++;
}
export function argumentsInOrder(sink: Sink, n: number): number {
  let i = n;
  return sink.put(i, i++);
}
export function assignedTest(it: Cursor): number {
  let c: number | null = null;
  if ((c = it.next()) !== null) return c;
  return -1;
}
export class Counter {
  count: number = 0;
  reset(): void { this.count = 0; }
  take(): number { return this.count++; }
  prefix(): number { return ++this.count; }
  compound(): number { return (this.count *= 2); }
}
export function untouched(n: number): number { return n + 1; }
export function optionalAssigned(it: Cursor): number {
  let c: number | null = null;
  return (c = it.next()) ?? it.next() ?? -1;
}
export function localPostfix(n: number): number { let count = n; return count++; }
export function mixedTruth(x: number | string | null): number { let held: number | string | null = null; if ((held = x)) return 1; return 0; }
export function assignedTernary(it: Cursor): number {
  let c: number | null = null;
  return (c = it.next()) !== null ? c : -1;
}
export class Receiver { n: number = 0; value(x: number): number { return this.n + x; } }
export async function awaitedReceiver(first: Receiver, second: Receiver): Promise<number> {
  let receiver = first;
  return await receiver.value((receiver = second).n);
}

let moduleCount = 0;
export function modulePostfix(): number { return moduleCount++; }

export function assignedAbsence(x: number | null | undefined): boolean { let value: number | null | undefined = 1; return (value = x) === null; }

export function assignedTruth(x: number | null | undefined): number { let value: number | null | undefined = 1; if ((value = x)) return 1; return 0; }

export function assignedCoalesce(x: number | null | undefined): number { let value: number | null | undefined = 1; return (value = x) ?? 4; }

export function assignedNullable(x: number | null): number | null | undefined { let value: number | null | undefined = 1; return (value = x); }

export function assignedNull(): number | null | undefined { let value: number | null | undefined = 1; return (value = null); }
