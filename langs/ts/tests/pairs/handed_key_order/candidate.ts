import { keys } from 'lodash';
import { log } from 'dep';
export type Pt = { a: number; b: string };

// An outside call reads the keys of what it is handed in property order: JSON.stringify writes them so, lodash's keys
// lists them so. Each unit below hands a record in one order here and in another (or the same) in the candidate.
export function enc(x: number, y: string): string { return JSON.stringify({ b: y, a: x }); }
export function encPt(p: Pt): string { return JSON.stringify({ b: p.b, a: p.a }); }
export function same(x: number, y: string): string { const r = { a: x, b: y }; return JSON.stringify(r); }
export function nested(x: number, y: string): string { return JSON.stringify({ o: { b: y, a: x } }); }
export function spreadCopy(x: number, y: string): string { const base = { b: y, a: x }; return JSON.stringify({ ...base }); }
export function indexKeys(x: number, y: string): string { return JSON.stringify({ 1: x, b: y }); }
export function ownParam(p: Pt): string { const q = p; return JSON.stringify(q); }
export function litVsParam(p: Pt): string { return JSON.stringify(p); }
export function ownElem(ps: Pt[]): string { if (!ps.length) return ""; const first = ps[0]; return JSON.stringify(first); }
export function libKeys(x: number, y: string): string { return keys({ b: y, a: x }).join(','); }
// the heap core's unit (a parameter written): its cells hold no key order, so the outside call is handed the order text beside the cell
export function heapHand(p: Pt): void { p.a = 1; log({ b: p.b, a: p.a }); }
// a member a test adds: the order term is the value's own test, `(if c then .. else ..)`
export function condSpread(c: boolean, x: number, y: string): string { return c ? JSON.stringify({ b: y, a: x }) : JSON.stringify({ a: x }); }
export function condSame(c: boolean, x: number, y: string): string { const on = c; return JSON.stringify({ a: x, ...(on ? { b: y } : {}) }); }
