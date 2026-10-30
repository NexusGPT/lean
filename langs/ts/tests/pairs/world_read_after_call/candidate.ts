// parent.ts with the read moved before the call: JavaScript tells each apart when the call changes the object
import { touch } from 'lib';
export type Box = { x: number; y: number };
export type Counter = { n: number; bump(): void };

export function anyMethod(e: any, g: any): number {
  const v = g.x;
  e.bump();
  return v;
}

export function anyRecord(e: any, p: Box): number {
  const v = p.x;
  e.bump();
  return v;
}

export function recordMethod(c: Counter): number {
  const k = c.n;
  c.bump();
  return k;
}

export function fnValue(p: Box, f: (q: Box) => void): number {
  const v = p.x;
  f(p);
  return v;
}

export function outside(p: Box): number {
  const v = p.x;
  touch(p);
  return v;
}

// restores x where the parent restores y: equal only when the call writes neither field
export function restore(p: Box, f: (q: Box) => void): void {
  const x = p.x;
  f(p);
  p.x = x;
}
