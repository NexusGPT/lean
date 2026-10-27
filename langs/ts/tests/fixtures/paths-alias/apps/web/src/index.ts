// a project whose tsconfig declares `paths` and no `baseUrl`: `@/util` is this package's src/util.ts, and
// `@fx/shared` is the workspace package packages/shared, resolved to its source
import { double } from '@/util';
import { offset } from '@fx/shared';

export function scaled(n: number): number {
  return double(n) + offset;
}
