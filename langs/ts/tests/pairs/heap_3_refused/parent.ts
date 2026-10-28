// heap-3, refused by spread-source (escape spread_source): a record copied by a spread or by Object.assign onto a
// literal from a value whose keys the function did not build. Lane A reads none of these units; lane B judges each.
export interface Rec { a: number; b: string }
export interface Bag { a: number; b: string; [k: string]: unknown }
export interface Opt { a?: number; b: string }

// an open record: lane B draws an undeclared entry (k0), which the spread copies
export function copyBag(s: Bag): Bag { return { ...s }; }
export function bumpBag(s: Bag): Bag { return { ...s, a: s.a + 1 }; }
export function assignBag(s: Bag): Bag { return Object.assign({}, s); }
// a plain record: lane B draws its declared fields only, so it finds no difference
export function copyRec(s: Rec): Rec { return { ...s }; }
// a spread after a member: an own key holding undefined overwrites it
export function late(s: Opt): Rec { return { a: 1, ...s, b: s.b }; }
