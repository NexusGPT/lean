// A loop that only guards and pushes is read as a filter and a map: run in Node and in Dafny on the same inputs (the
// differential step), so the reading keeps the order of the kept elements and runs each guard and each push once.
export function doubledPositives(xs: number[]): number[] {
  const out: number[] = [];
  for (const x of xs) {
    if (x <= 0) continue;
    const d = x * 2;
    out.push(d + 1);
  }
  return out;
}

export function smallOdd(xs: number[], lim: number): number[] {
  const out: number[] = [7];
  for (const x of xs) {
    if (x < lim) {
      if (x % 2 === 0) continue;
      out.push(x);
    }
  }
  return out;
}

export function shifted(xs: number[], k: number): number[] {
  const out: number[] = [];
  xs.forEach((x) => {
    if (x === k) return;
    out.push(x - k);
  });
  return out;
}
