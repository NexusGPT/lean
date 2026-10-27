// expect: reference-equality
// record against record compares references, with or without a literal elsewhere in the function
type Opts = { limit: number };
export function same(x: Opts, y: Opts): boolean { return x === y; }
