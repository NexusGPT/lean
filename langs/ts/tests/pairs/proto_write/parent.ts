// A dictionary write through a key that may be '__proto__' reaches the setter of Object.prototype: an object or null
// replaces the prototype (refused), a primitive is ignored (the write is skipped on that key); no own key is made.
export type Slot = 'x' | '__proto__';
export interface Box { n: number }
// an object value: the parent writes it only under another key; the candidate's computed literal key makes an own key on every key
export function own(k: Slot): number {
  const s: string = k;
  const d: Record<string, Box> = {};
  if (k !== '__proto__') d[k] = { n: 1 };
  return Object.prototype.hasOwnProperty.call(d, s) ? 1 : 0;
}
// a primitive value: the write on '__proto__' is ignored, so the own-key test is false there
export function mark(k: Slot): number {
  const s: string = k;
  const d: Record<string, number> = {};
  d[k] = 1;
  return Object.prototype.hasOwnProperty.call(d, s) ? 1 : 0;
}
// two writes of a primitive under one key
export function tally(k: string, n: number): number {
  const d: Record<string, number> = {};
  d[k] = n;
  d[k] = n + 1;
  return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : 0;
}
// an object value under a literal key
export function named(n: number): number {
  const d: Record<string, Box> = {};
  d['a'] = { n };
  return Object.prototype.hasOwnProperty.call(d, 'a') ? 1 : 0;
}
// untouched
export function keep(x: number): number { return x + 1; }
