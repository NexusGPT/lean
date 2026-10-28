// definite_assignment: candidates
// NaN where the parent returns undefined (flag false)
export function late(flag: boolean): number {
  let v!: number;
  if (flag) v = 1;
  return v + 0;
}

// a refactor of the read
export function early(k: number): number {
  let v!: number;
  v = k * 2;
  return 1 + v;
}

export function plain(k: number): number {
  return k;
}
