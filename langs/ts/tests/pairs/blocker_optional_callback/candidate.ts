// An optional call on a callback the enclosing function received, inside a callback (design/top-blockers.md)
export type OnItem = ((n: number) => void) | undefined;

export function notifyAll(xs: readonly number[], onItem: OnItem): number {
  xs.forEach((x) => { onItem?.(x); });
  return xs.length;
}

export function notifyNext(xs: readonly number[], onItem: OnItem): number {
  xs.forEach((x) => { onItem?.(x + 1); });
  return xs.length;
}

export function notifyNamed(xs: readonly number[], onItem: OnItem): number {
  const cb = onItem;
  xs.forEach((x) => { cb?.(x); });
  const total = xs.length;
  return total;
}

export interface Timer { later(cb: () => void): void }

export function notifyLater(t: Timer, onDone: OnItem, n: number): number {
  const next = n + 1;
  t.later(() => { onDone?.(n); });
  return next;
}

export type Handlers = { onItem?: (n: number) => void; label: string };

export function notifyProp(xs: readonly number[], h: Handlers): number {
  xs.forEach((x) => { h.onItem?.(x); });
  const total = xs.length;
  return total;
}

export function notifyPropNext(xs: readonly number[], h: Handlers): number {
  xs.forEach((x) => { h.onItem?.(x * 2); });
  return xs.length;
}
