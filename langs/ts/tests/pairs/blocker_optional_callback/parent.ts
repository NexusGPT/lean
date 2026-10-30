// An optional call on a callback the enclosing function received, inside a callback (design/top-blockers.md)
export type OnItem = ((n: number) => void) | undefined;

export function notifyAll(xs: readonly number[], onItem: OnItem): number {
  xs.forEach((x) => { onItem?.(x); });
  return xs.length;
}

export function notifyNext(xs: readonly number[], onItem: OnItem): number {
  xs.forEach((x) => { onItem?.(x); });
  return xs.length;
}

export function notifyNamed(xs: readonly number[], onItem: OnItem): number {
  const cb = onItem;
  xs.forEach((x) => { cb?.(x); });
  return xs.length;
}

export interface Timer { later(cb: () => void): void }

export function notifyLater(t: Timer, onDone: OnItem, n: number): number {
  t.later(() => { onDone?.(n); });
  return n + 1;
}
