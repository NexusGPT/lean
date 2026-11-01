import type { Shape, Id } from './shapes';

export interface Options { retries: number; label?: string }
export type Mode = 'fast' | 'safe' | 'auto';

export function area(s: Readonly<Shape>): number {
  return s.w * s.h;
}

export function retries(o: Options): number {
  return (o.retries as number) + 1;
}

export type Key = Id;
