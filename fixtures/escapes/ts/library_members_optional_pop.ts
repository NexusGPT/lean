// expect: unsupported-call
// pop in an optional chain removes from a receiver that may be absent; the receiver is not rebound
export function last(xs: string[] | undefined): string | undefined {
  const c = xs === undefined ? undefined : [...xs];
  return c?.pop();
}
