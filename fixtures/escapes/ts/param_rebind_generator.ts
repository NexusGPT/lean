// expect: param-assign
export function* counted(n: number): Generator<number> {
  n = n + 1;
  yield n;
}
