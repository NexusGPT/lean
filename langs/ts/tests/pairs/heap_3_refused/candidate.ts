// heap-3, refused by spread-source (escape spread_source): a record copied by a spread or by Object.assign onto a
// literal from a value whose keys the function did not build. Lane A reads none of these units; lane B judges each.
export interface Rec { a: number; b: string }
export interface Bag { a: number; b: string; [k: string]: unknown }
export interface Opt { a?: number; b: string }

export function assignBag(s: Bag): Bag { return Object.assign({}, { a: s.a, b: s.b }); }
export function late(s: Opt): Rec { return { a: 1, b: s.b }; }
