// a WITNESS in a caller whose own text is unchanged comes through the same-file callee that changed

// changed: its own inputs show the difference
export function helper(x: number): number {
  return x + 2;
}

// changed only for arrays longer than eight, which its own generated inputs never reach
export function padded(xs: number[]): number {
  return xs.length > 8 ? xs[0] + 1 : 0;
}

// unchanged text: the difference comes through helper
export function Caller(n: number): number {
  return helper(n) * 2;
}

// unchanged text: the difference comes through padded, on the ten-element array this function builds
export function Total(n: number): number {
  return n + padded([n, n, n, n, n, n, n, n, n, n]);
}

// untouched
export function double(x: number): number {
  return x * 2;
}
