// A local bound to a new record of primitive fields, handed to a call that may write it, then read.
export function local(g: (b: { n: number }) => void): number {
  const x = { n: 1 };
  g(x);
  return x.n;
}

// The same record written in the call: no name of the unit holds it after the call.
export function inline(g: (b: { n: number }) => void, k: number): number {
  g({ n: 1 });
  return k;
}
