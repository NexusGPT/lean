// expect: param-mutation
// pop used as a value on a parameter changes the caller's array
export function last(xs: string[]): string {
  return xs.pop() ?? "";
}
