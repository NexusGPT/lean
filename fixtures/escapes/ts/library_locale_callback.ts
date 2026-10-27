// expect: unsupported-call
// a locale read inside a callback: the callback is read as a pure function
export function labels(xs: number[]): string[] {
  return xs.map((x) => x.toLocaleString());
}
