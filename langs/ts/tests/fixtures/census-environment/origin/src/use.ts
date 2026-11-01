import { take, type Box } from './types';

export function unbox(b: Box, sink: (v: unknown) => void): unknown[] {
  let h = b.h;
  take(h, sink);
  h = b.h; // a name rebound after the call: refused read-after-call (w1g reads a list or a one-level write of h through the world)
  return [h.n];
}
