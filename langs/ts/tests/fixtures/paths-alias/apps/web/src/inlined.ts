// the candidate of index.ts: the aliased helper's body written inline, the same behaviour when `@/util` is read for real
import { offset } from '@fx/shared';

export function scaled(n: number): number {
  return n * 2 + offset;
}
