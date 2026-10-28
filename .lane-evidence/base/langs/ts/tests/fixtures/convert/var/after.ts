// var: a var whose precondition holds becomes let; one captured by a closure inside a loop is listed
export function next(value: number): number {
  let result = value + 1;
  return result * 2;
}

export function lastSeen(xs: number[]): number[] {
  const out: number[] = [];
  for (const x of xs) {
    var y = x * 2;
    out.push(y);
    const read = (): number => y;
    out.push(read());
  }
  return out;
}
