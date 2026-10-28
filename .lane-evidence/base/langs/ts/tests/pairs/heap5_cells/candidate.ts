// stage 5 step 16: a Set of records holds its items by identity, a Map reads a primitive value or absent, and the
// copy forms new Set, new Map and Array.from allocate a fresh cell of the source's contents
export interface Tag { name: string }
export interface Board { seen: Set<Tag>; counts: Map<string, number>; ids: number[] }

export function mark(b: Board, t: Tag): void {
  b.seen.add(t);
}

export function isSeen(b: Board, t: Tag): boolean {
  return !b.seen.has(t);
}

export function countOf(b: Board, k: string): number {
  const n = b.counts.get(k);
  return n ?? 0;
}

export function unique(b: Board): number {
  return new Set(b.ids).size;
}

export function copyIds(b: Board): number[] {
  return [...b.ids];
}
