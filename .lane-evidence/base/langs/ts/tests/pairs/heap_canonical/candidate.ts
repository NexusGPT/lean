export type Leaf = { v: number };
export type Box = { a: Leaf; b: Leaf; names: string[]; items: Leaf[] };
// two fresh leaves attached to the box, allocated b then a
export function attach(box: Box): number { const b: Leaf = { v: 2 }; box.b = b; const a: Leaf = { v: 1 }; box.a = a; return 0; }
// a fresh array of two fresh leaves, allocated in the other order
export function pair(box: Box): Leaf[] { const b: Leaf = { v: 2 }; const a: Leaf = { v: 1 }; return [a, b]; }
// the old leaf is written, then unhooked from the box; a caller who still holds it sees the write
export function unhook(box: Box): number { box.a.v = 2; box.a = { v: 0 }; return 0; }
// no temporary
export function tally(box: Box): number { return box.names.length + box.items.length; }
