// expect: assign-target
export function run(p: { a: number }, n: number): number {
  const q = Object.assign(p, { a: n });
  return q.a;
}
