// A field read after a transition is a world read (design/alias-result.md, 2026-10-30 world read): one unit per
// transition kind, the read after the call
import { touch } from 'lib';
export type Box = { x: number; y: number };
export type Counter = { n: number; bump(): void };

// a method call on an any value, then a field of another any value it may be
export function anyMethod(e: any, g: any): number {
  e.bump();
  return g.x;
}

// a method call on an any value, then a field of a record it may be
export function anyRecord(e: any, p: Box): number {
  e.bump();
  return p.x;
}

// a method call on a record value, then its own field
export function recordMethod(c: Counter): number {
  c.bump();
  return c.n;
}

// a call of a function value handed the object, then its field
export function fnValue(p: Box, f: (q: Box) => void): number {
  f(p);
  return p.x;
}

// an outside call handed the object, then its field
export function outside(p: Box): number {
  touch(p);
  return p.x;
}

// a one-level write after the call: the other fields are the call's (pair claim of the narrowing lane)
export function restore(p: Box, f: (q: Box) => void): void {
  const y = p.y;
  f(p);
  p.y = y;
}
