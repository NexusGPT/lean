// expect: import
import { readFileSync } from 'node:fs';
export function size(p: string): number {
  return readFileSync(p).length;
}
