// Stage 5 rank 15: a for header outside the counted form is read as init; while (cond) { body; step }, continue running
// the step; the loop takes a derived bound when the condition and the step give one, else it is one opaque block.

// a batch loop with a variable step: no bound follows from `i += size`; the whole statement is one opaque block
export function chunks(xs: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

// the step `i = i + 1` and a `continue` that runs it: a derived bound, the counter against the array's length
export function sumPositive(xs: number[]): number {
  let acc = 0;
  for (let i = 0; i < xs.length; i = i + 1) {
    if (xs[i] <= 0) continue;
    acc = acc + xs[i];
  }
  return acc;
}

// no condition: the first statement's break is the exit, and the bound follows from it
export function firstNegative(xs: number[]): number {
  for (let i = 0; ; i++) {
    if (i >= xs.length) break;
    if (xs[i] < 0) return i;
  }
  return -1;
}

// two counters and a comma step: an opaque block
export function mirrored(xs: number[]): boolean {
  for (let i = 0, j = xs.length - 1; i < j; i++, j--) {
    if (xs[i] !== xs[j]) return false;
  }
  return true;
}

// untouched: an init from a call and a step by assignment
export function occurrences(text: string, marker: string): number {
  let count = 0;
  for (let at = text.indexOf(marker); at !== -1; at = text.indexOf(marker, at + 1)) count = count + 1;
  return count;
}
