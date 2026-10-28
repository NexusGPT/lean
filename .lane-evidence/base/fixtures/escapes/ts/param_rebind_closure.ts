// expect: param-assign
export function reader(n: number): () => number {
  const read = () => n;
  n = n + 1;
  return read;
}
