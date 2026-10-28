// expect: definite-assignment
// a let read inside a nested function before any write: TypeScript does not check a read in a nested function, the value
// there is undefined, and lean tests an unassigned let only in the function's own statements. Assign it first, or give
// it a start value.
export function late(flag: boolean): number {
  let v: number;
  const get = () => v;
  const r = get();
  if (flag) v = 1;
  return r;
}
