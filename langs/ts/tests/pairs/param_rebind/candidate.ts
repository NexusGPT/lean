// param-rebind: a parameter reassigned in its own body is a local that starts as the argument

// a page number clamped in place (`if (page < 1) page = 1`), then read
export function offsetOf(page: number, size: number): number {
  if (page < 1) {
    page = 0;
  }
  return (page - 1) * size;
}

// an optional parameter given its default by a rebinding (`count = count ?? 1`)
export function weightOf(name: string, count?: number): number {
  const c = count ?? 1;
  return c + c + name.length;
}

// one read before the rebinding and one after: two values, in order
export function spread(n: number): number {
  return n * 3;
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
  const x = point.x + dx;
  return x * 10 + point.y;
}
