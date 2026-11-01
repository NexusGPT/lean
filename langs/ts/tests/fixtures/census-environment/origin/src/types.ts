import type { Handle } from 'handle-source';

export type Box = { h: Handle };

export function take(x: Handle, sink: (v: Handle) => void): Handle[] {
  sink(x);
  return [x];
}
