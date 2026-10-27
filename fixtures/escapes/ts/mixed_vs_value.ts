// expect: mixed-types
// two non-literal operands, one a primitive-or-record union: the record arm compares references; narrow it first
type Opts = { limit: number };
export function same(x: string | Opts, y: string): boolean { return x === y; }
