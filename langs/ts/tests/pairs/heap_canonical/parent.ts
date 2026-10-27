export type Leaf = { v: number };
export type Box = { a: Leaf; b: Leaf; names: string[]; items: Leaf[] };
// two fresh leaves attached to the box, allocated a then b
export function attach(box: Box): number { const a: Leaf = { v: 1 }; box.a = a; const b: Leaf = { v: 2 }; box.b = b; return 0; }
// a fresh array of two fresh leaves, allocated in order
export function pair(box: Box): Leaf[] { const a: Leaf = { v: 1 }; const b: Leaf = { v: 2 }; return [a, b]; }
// the old leaf is written, then unhooked from the box; a caller who still holds it sees the write
export function unhook(box: Box): number { box.a.v = 1; box.a = { v: 0 }; return 0; }
// a temporary nobody keeps
export function tally(box: Box): number { const tmp = box.names.slice(0); return tmp.length + box.items.length; }
