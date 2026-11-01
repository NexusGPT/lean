import type { Handle } from 'handle-source';

export type Box = { h: Handle };

export function take(x: Handle, sink: (v: Handle) => void): Handle[] {
  let y = x;
  sink(y);
  y = x; // a name rebound after the call: refused read-after-call (w1g reads a list of y through the world)
  return [y];
}
