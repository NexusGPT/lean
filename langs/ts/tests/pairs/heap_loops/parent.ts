// The heap core, stage 4: a loop over an array is a recursive helper that threads the heap.
type Item = { id: string; n: number };

// the sum of the counts
export function total(a: number[]): number {
  let s = 0;
  for (const x of a) {
    s = s + x;
  }
  return s;
}

// raises every count by k plus one, in place
export function raise(a: number[], k: number): number {
  const d = k + 1;
  for (let i = 0; i < a.length; i++) {
    a[i] = a[i] + d;
  }
  return a.length;
}

// how many counts are positive
export function positives(a: number[]): number {
  let n = 0;
  for (const x of a) {
    if (x > 0) {
      n = n + 1;
    }
  }
  return n;
}

// the sum of the items' counts
export function weight(items: Item[]): number {
  let w = 0;
  for (const it of items) {
    w = w + it.n;
  }
  return w;
}
