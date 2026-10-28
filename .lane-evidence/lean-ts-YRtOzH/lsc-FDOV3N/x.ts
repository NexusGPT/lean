// Stage 5 rank 15: for headers outside the counted form, run in Node and in Dafny on the same inputs (the differential
// step): the step must run exactly once per iteration, on the plain path and through `continue`.
export function sumPositiveGeneral(xs: number[]): number {
  let acc = 0;
  for (let i = 0; i < xs.length; i = i + 1) {
    if (xs[i] <= 0) continue;
    acc = acc + xs[i];
  }
  return acc;
}

export function firstNegativeGeneral(xs: number[]): number {
  for (let i = 0; ; i++) {
    if (i >= xs.length) break;
    if (xs[i] < 0) return i;
  }
  return -1;
}

export function repeatAdd(k: number): number {
  const n = 3;
  let c = 0;
  for (let i = 0; i < n; i = i + 1) c = c + k;
  return c;
}
