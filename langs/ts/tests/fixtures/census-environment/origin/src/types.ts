import type { Handle } from 'handle-source';

export type Box = { h: Handle };

export function take(x: Handle): void {
  void x;
}
