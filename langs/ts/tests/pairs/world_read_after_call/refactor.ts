// parent.ts with the read after the call kept, written another way: equal in JavaScript, lane A proves each
import { touch } from 'lib';
export type Box = { x: number; y: number };
export type Counter = { n: number; bump(): void };

export function anyMethod(ev: any, other: any): number {
  ev.bump();
  const v = other.x;
  return v;
}

export function anyRecord(ev: any, box: Box): number {
  ev.bump();
  const v = box.x;
  return v;
}

export function recordMethod(counter: Counter): number {
  counter.bump();
  const k = counter.n;
  return k;
}

export function fnValue(box: Box, h: (q: Box) => void): number {
  h(box);
  const v = box.x;
  return v;
}

export function outside(box: Box): number {
  touch(box);
  const v = box.x;
  return v;
}

export function restore(box: Box, h: (q: Box) => void): void {
  const kept = box.y;
  h(box);
  box.y = kept;
}
