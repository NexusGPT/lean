import type { Shape } from './shapes';

export interface Options { retries: number }
export type Mode = 'fast' | 'safe';

export function area(s: Shape): number {
  return s.w * s.h;
}

export function retries(o: Options): number {
  return o.retries + 1;
}
