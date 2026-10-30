import type { Chunk } from 'linked-dep';
export function fits(c: Chunk, room: number): boolean {
  return c.bytes < room;
}
