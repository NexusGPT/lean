// The heap core, stage 4: a loop over an array is a recursive helper that threads the heap.
type Item = { id: string; n: number };

// the sum of the counts, each counted one too high
export function total(a: number[]): number {
  let s = 0;
  for (const x of a) {
    s = s + x + 1;
  }
  return s;
}

// the same loop, its step computed in the other order
export function raise(a: number[], k: number): number {
  const d = 1 + k;
  for (let i = 0; i < a.length; i++) {
    a[i] = a[i] + d;
  }
  return a.length;
}

// the same count through a compound assignment
export function positives(a: number[]): number {
  let n = 0;
  for (const x of a) {
    if (x > 0) {
      n += 1;
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
