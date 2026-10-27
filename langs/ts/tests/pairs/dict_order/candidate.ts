// A dictionary (a plain object with a string index) keeps its keys in creation order, array indices first in
// ascending order (ECMA-262 10.1.11 OrdinaryOwnPropertyKeys). Object.keys, Object.entries and for-in read that order.

// the same two keys written in the other order: Object.keys sees it
export function keyList(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['y'] = b;
  d['x'] = a;
  return Object.keys(d).join(',');
}

// the other order, read back only by key: the same answer
export function lookup(a: number, b: number): number {
  const d: Record<string, number> = {};
  d['y'] = b;
  d['x'] = a;
  return d['x'] * 10 + d['y'];
}

// the same pairs through for-in and an index read
export function pairsText(a: number, b: number): string {
  const d: Record<string, number> = { x: a, y: b };
  const out: string[] = [];
  for (const k in d) {
    const v = d[k];
    out.push(k + '=' + v);
  }
  return out.join(',');
}

// the index written first: it still comes first, the same keys come back
export function indexFirst(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['2'] = b;
  d['b'] = a;
  return Object.keys(d).join(',');
}

// the key written once, without the delete: it keeps its first place
export function reinsert(a: number, b: number): string {
  const d: Record<string, number> = {};
  d['x'] = a;
  d['y'] = b;
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

// the same record with its fields written in the other order: Object.keys sees it
export function viaRecord(x: number, y: number): string {
  const r = { b: y, a: x };
  return names(r);
}
