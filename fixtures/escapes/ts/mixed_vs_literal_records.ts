// expect: reference-equality
// record against record compares references, with or without a literal elsewhere in the function; two plain data
// records are read as node identity (heap shapes), a record holding a Date is no plain data record and stays refused
type Opts = { limit: number; at: Date };
export function same(x: Opts, y: Opts): boolean { return x === y; }
