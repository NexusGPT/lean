// expect: promise
// a promise read out of a collection has no identity in the reading
export function last(ps: Promise<number>[]): Promise<number> {
  return ps.reduce((a, b) => b);
}
