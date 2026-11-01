import { take, type Box } from './types';

export function unbox(b: Box): unknown[] {
  const h = b.h;
  take(h);
  h.n += 1; // a compound write after the call: refused read-after-call
  return [];
}
