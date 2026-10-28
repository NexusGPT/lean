// expect: operator-value-context
export function conditionalUpdate(flag: boolean): number {
  let x = 0;
  const value = flag && x++;
  return value ? x : 0;
}
