// expect: operator-value-context
export function replacedReference(n: number): number {
  let r = { n };
  const s = { n: n + 1 };
  return (r.n = (r = s).n);
}
