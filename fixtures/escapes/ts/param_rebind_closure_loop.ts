// expect: param-assign
export function readers(n: number): (() => number)[] {
  const out: (() => number)[] = [];
  for (let i = 0; i < 3; i++) {
    n = n + i;
    out.push(() => n);
  }
  return out;
}
