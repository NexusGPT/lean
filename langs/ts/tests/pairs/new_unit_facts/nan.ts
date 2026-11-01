// NaN out of an input that holds none (lane w9k, exec/new-unit.mjs nanAt, finiteInputs): new:nan

// (c) the mean of the empty list: 0 / 0 (LEAN_BREAK=nan-fact: no record)
export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// (d) guarded: no record
export function meanOr(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// (e) NaN only where the input is NaN: no record
export function half(x: number): number {
  return x / 2;
}

// (f) a field holding NaN: the record names it
export function stats(xs: number[]): { n: number; mean: number } {
  return { n: xs.length, mean: xs.reduce((a, b) => a + b, 0) / xs.length };
}
