// expect: generator
// a generator function declaration is outside the subset
export function total(n: number): number {
  function* count(): Generator<number> {
    for (let i = 0; i < n; i++) yield i;
  }
  let s = 0;
  for (const i of count()) s += i;
  return s;
}
