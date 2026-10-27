// The library transition table (translate/library.json): the array rows as heap transitions in the proof lane.
type Item = { id: number; tags: string[] };
type Box = { items: Item[]; names: string[] };
// splice removes in place
export function dropFirst(box: Box): number { box.names.shift(); return 1 + box.names.length; }
// two removals in a row
export function dropTwo(box: Box): number { box.names.splice(0, 1); box.names.splice(0, 1); return box.names.length; }
// the same count through slice and a replacement: the old array is left as it was
export function dropFirstCopy(box: Box): number { const rest = box.names.slice(1); box.names = rest; return rest.length + 1; }
// reverse in place; the receiver is returned
export function flip(box: Box): string[] { box.names.reverse(); const out = box.names; return out; }
// slice allocates: the result is a fresh array
export function head(box: Box): string[] { return box.names.slice(0, 3); }
// concat allocates: the receiver's items, then the argument's
export function joined(box: Box, more: string[]): string[] { return more.concat(box.names); }
// untouched
export function count(box: Box): number { return box.items.length + box.names.length; }
