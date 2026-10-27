// The heap core, stage 4: element access on an array path. An access out of range is undefined in JavaScript; the
// proof lane marks it, so a unit whose index the code does not keep in range is never proved.

// adds two to the i-th count when there is one
export function bump(a: number[], i: number): number {
  if (0 <= i && i < a.length) {
    a[i] = a[i] + 2;
    return a[i];
  }
  return 0;
}

// the empty case first, then the first count through a name
export function first(a: number[]): number {
  if (a.length === 0) {
    return 0;
  }
  const x = a[0];
  return x;
}

// the empty case first, then the write through a named index
export function setFirst(a: number[], v: number): number {
  if (a.length === 0) {
    return 0;
  }
  const k = 0;
  a[k] = v;
  return 1;
}

// the i-th name itself: equal on every index in range, different out of range (undefined is not "undefined")
export function label(a: string[], i: number): string {
  return a[i];
}

// the i-th count through a name: the same JavaScript, but the index may be out of range, so it is not proved
export function get(a: number[], i: number): number {
  const x = a[i];
  return x;
}

// the number of counts
export function size(a: number[]): number {
  return a.length;
}
