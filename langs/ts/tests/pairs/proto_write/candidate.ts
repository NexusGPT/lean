// A dictionary write through a key that may be '__proto__' reaches the setter of Object.prototype: an object or null
// replaces the prototype (refused), a primitive is ignored (the write is skipped on that key); no own key is made.
export type Slot = 'x' | '__proto__';
export interface Box { n: number }
// an object value: the parent writes it only under another key; the candidate's computed literal key makes an own key on every key
export function own(k: Slot): number {
  const s: string = k;
  const d: Record<string, Box> = { [k]: { n: 1 } };
  return Object.prototype.hasOwnProperty.call(d, s) ? 1 : 0;
}
// a primitive value: the candidate answers as if the write made a key
export function mark(k: Slot): number {
  const s: string = k;
  const d: Record<string, number> = {};
  d[k] = 1;
  return 1;
}
// one write of the last value, under the same key through another name
export function tally(k: string, n: number): number {
  const d: Record<string, number> = {};
  const key = k;
  d[key] = n + 1;
  return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : 0;
}
// the literal key through a const of literal type
export function named(n: number): number {
  const d: Record<string, Box> = {};
  const key = 'a';
  d[key] = { n };
  return Object.prototype.hasOwnProperty.call(d, key) ? 1 : 0;
}
// untouched
export function keep(x: number): number { return x + 1; }
