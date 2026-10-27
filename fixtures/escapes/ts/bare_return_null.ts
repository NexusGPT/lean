// expect: bare-return
// a result that admits null but not undefined: a bare return would yield the absent value the result excludes
export function first(xs: number[]): number | null { if (xs.length === 0) return; return xs[0]; }
