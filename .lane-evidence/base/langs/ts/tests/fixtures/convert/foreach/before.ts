// foreach: a forEach with an index over an array is a counted for; a bare return ends one step
export function weighted(xs: number[]): number {
  let t = 0;
  xs.forEach((x, i) => { t += x * i; });
  return t;
}

export function fromLimit(xs: number[], limit: number): number {
  let seen = 0;
  xs.forEach((x, i) => {
    if (x < limit) return;
    seen += i;
  });
  return seen;
}
