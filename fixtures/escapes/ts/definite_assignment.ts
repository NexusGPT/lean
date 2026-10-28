// expect: definite-assignment
// `let v!: number` read before its first assignment on one path: undefined at run time, while the proof lane would
// give it some number. Assign it first, or give it a start value.
export function late(flag: boolean): number {
  let v!: number;
  if (flag) v = 1;
  return v;
}
