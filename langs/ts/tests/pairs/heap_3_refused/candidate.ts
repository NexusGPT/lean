// heap-3, refused by spread-source (escape spread_source): a record copied by Object.assign onto a literal from a value
// the function did not build (read as a function of its arguments' values). Lane A reads none; lane B judges each.
export interface Rec { a: number; b: string }
export interface Bag { a: number; b: string; [k: string]: unknown }

export function assignBag(s: Bag): Bag { return Object.assign({}, { a: s.a, b: s.b }); }
