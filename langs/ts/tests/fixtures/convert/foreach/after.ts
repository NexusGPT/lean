// foreach: a forEach with an index over an array is a counted for; a bare return ends one step
export function weighted(xs: number[]): number {
  let t = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (x === undefined) continue;
    t += x * i;
  }
  return t;
}

export function fromLimit(xs: number[], limit: number): number {
  let seen = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (x === undefined) continue;
    if (x < limit) continue;
    seen += i;
  }
  return seen;
}
