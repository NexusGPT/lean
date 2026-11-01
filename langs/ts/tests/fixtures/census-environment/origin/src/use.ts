import { take, type Box } from './types';

export function unbox(b: Box, sink: (v: unknown) => void): unknown[] {
  const h = b.h;
  take(h, sink);
  return [h];
}
