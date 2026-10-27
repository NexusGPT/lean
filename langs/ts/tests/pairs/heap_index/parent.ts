// The heap core, stage 4: element access on an array path. An access out of range is undefined in JavaScript; the
// proof lane marks it, so a unit whose index the code does not keep in range is never proved.

// adds one to the i-th count when there is one
export function bump(a: number[], i: number): number {
  if (0 <= i && i < a.length) {
    a[i] = a[i] + 1;
    return a[i];
  }
  return 0;
}

// the first count, or zero for an empty list
export function first(a: number[]): number {
  if (a.length > 0) {
    return a[0];
  }
  return 0;
}

// replaces the first count when there is one
export function setFirst(a: number[], v: number): number {
  if (a.length > 0) {
    a[0] = v;
    return 1;
  }
  return 0;
}

// the i-th name, joined to nothing
export function label(a: string[], i: number): string {
  return a[i] + "";
}

// the i-th count, the index unchecked
export function get(a: number[], i: number): number {
  return a[i];
}

// the number of counts
export function size(a: number[]): number {
  return a.length;
}
