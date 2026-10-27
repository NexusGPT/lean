// param-rebind: a parameter reassigned in its own body is a local that starts as the argument

// a page number clamped in place (`if (page < 1) page = 1`), then read
export function offsetOf(page: number, size: number): number {
  if (page < 1) {
    page = 1;
  }
  return (page - 1) * size;
}

// an optional parameter given its default by a rebinding (`count = count ?? 1`)
export function weightOf(name: string, count?: number): number {
  count = count ?? 1;
  return count * 2 + name.length;
}

// one read before the rebinding and one after: two values, in order
export function spread(n: number): number {
  const before = n;
  n = n * 2;
  return before + n;
}

// a rebinding inside a bounded loop: the loop carries the parameter as its state
export function drained(total: number, steps: number[]): number {
  for (let i = 0; i < steps.length; i++) {
    total = total - steps[i];
  }
  return total;
}

// a record parameter rebound to a fresh record, then read
export function bumped(point: { x: number; y: number }, dx: number): number {
  point = { x: point.x + dx, y: point.y };
  return point.x * 10 + point.y;
}
