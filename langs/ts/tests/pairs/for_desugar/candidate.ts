// Stage 5 rank 15: a for header outside the counted form is read as init; while (cond) { body; step }, continue running
// the step; the loop takes a derived bound when the condition and the step give one, else it is one opaque block.

// a batch loop with a variable step: no bound follows from `i += size`; the whole statement is one opaque block
export function chunks(xs: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

// a refactor: the accumulation written as `+=` (the same new value)
export function sumPositive(xs: number[]): number {
  let acc = 0;
  for (let i = 0; i < xs.length; i = i + 1) {
    if (xs[i] <= 0) continue;
    acc += xs[i];
  }
  return acc;
}

// changed behaviour: a zero counts as negative: a WITNESS on an array holding 0 before any negative
export function firstNegative(xs: number[]): number {
  for (let i = 0; ; i++) {
    if (i >= xs.length) break;
    if (xs[i] <= 0) return i;
  }
  return -1;
}

// changed behaviour: j starts past the end, so the first comparison reads undefined: a WITNESS on any non-empty array
export function mirrored(xs: number[]): boolean {
  for (let i = 0, j = xs.length; i < j; i++, j--) {
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
