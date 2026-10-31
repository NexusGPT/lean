import { take, type Box } from './types';

export function unbox(b: Box): unknown[] {
  const h = b.h;
  take(h);
  return [h];
}
