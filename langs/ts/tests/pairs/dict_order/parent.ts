// A dictionary (a plain object with a string index) keeps its keys in creation order, array indices first in
// ascending order (ECMA-262 10.1.11 OrdinaryOwnPropertyKeys). Object.keys, Object.entries and for-in read that order.

// the keys of a dictionary written in one order
export function keyList(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['x'] = a;
  d['y'] = b;
  return Object.keys(d).join(',');
}

// two keys written, read back only by key
export function lookup(a: number, b: number): number {
  const d: Record<string, number> = {};
  d['x'] = a;
  d['y'] = b;
  return d['x'] * 10 + d['y'];
}

// each key with its value, in property order, through Object.entries
export function pairsText(a: number, b: number): string {
  const d: Record<string, number> = { x: a, y: b };
  const out: string[] = [];
  for (const [k, v] of Object.entries(d)) out.push(k + '=' + v);
  return out.join(',');
}

// array indices come first in ascending order, whatever their creation order
export function indexFirst(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['b'] = a;
  d['2'] = b;
  return Object.keys(d).join(',');
}

// a key deleted and written again goes last
export function reinsert(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['x'] = a;
  d['y'] = b;
  delete d['x'];
  d['x'] = a;
  return Object.keys(d).join(',');
}

// untouched: how many keys a dictionary has
export function countKeys(d: Record<string, number>): number {
  return Object.keys(d).length;
}

// the keys of a dictionary handed in
function names(d: Record<string, number>): string {
  return Object.keys(d).join(',');
}

// a record handed to a dictionary parameter: its keys come back in the order its fields were written
export function viaRecord(x: number, y: number): string {
  const r = { a: x, b: y };
  return names(r);
}
