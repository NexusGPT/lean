// definite_assignment: `let v!: T` turns off the check that v is assigned before it is read
// read before its first assignment when flag is false: undefined is returned
export function late(flag: boolean): number {
  let v!: number;
  if (flag) v = 1;
  return v;
}

// assigned first, then read: inside the subset
export function early(k: number): number {
  let v!: number;
  v = k * 2;
  return v + 1;
}

export function plain(k: number): number {
  return k;
}
