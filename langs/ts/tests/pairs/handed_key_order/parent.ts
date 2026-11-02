import { keys } from 'lodash';
import { log } from 'dep';
export type Pt = { a: number; b: string };

// An outside call reads the keys of what it is handed in property order: JSON.stringify writes them so, lodash's keys
// lists them so. Each unit below hands a record in one order here and in another (or the same) in the candidate.
export function enc(x: number, y: string): string { return JSON.stringify({ a: x, b: y }); }
export function encPt(p: Pt): string { return JSON.stringify({ a: p.a, b: p.b }); }
export function same(x: number, y: string): string { return JSON.stringify({ a: x, b: y }); }
export function nested(x: number, y: string): string { return JSON.stringify({ o: { a: x, b: y } }); }
export function spreadCopy(x: number, y: string): string { const base = { a: x, b: y }; return JSON.stringify({ ...base }); }
export function indexKeys(x: number, y: string): string { return JSON.stringify({ b: y, 1: x }); }
export function ownParam(p: Pt): string { return JSON.stringify(p); }
export function litVsParam(p: Pt): string { return JSON.stringify({ a: p.a, b: p.b }); }
export function ownElem(ps: Pt[]): string { return ps.length ? JSON.stringify(ps[0]) : ""; }
export function libKeys(x: number, y: string): string { return keys({ a: x, b: y }).join(','); }
// the heap core's unit (a parameter written): its cells hold no key order, so the outside call is handed the order text beside the cell
export function heapHand(p: Pt): void { p.a = 1; log({ a: p.a, b: p.b }); }
// a member a test adds: the order term is the value's own test, `(if c then .. else ..)`
export function condSpread(c: boolean, x: number, y: string): string { return JSON.stringify({ a: x, ...(c ? { b: y } : {}) }); }
export function condSame(c: boolean, x: number, y: string): string { return JSON.stringify({ a: x, ...(c ? { b: y } : {}) }); }
