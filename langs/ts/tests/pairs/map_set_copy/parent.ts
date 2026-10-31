// stage 5 step 16 (design/heap-stage5.md section 16): a Map keyed by records and a Set of records hold their keys and
// items by identity; the copy forms new Set, new Map and Array.from allocate a fresh cell of the source's contents
export interface Tag { name: string }
export interface Board { byTag: Map<Tag, number>; seen: Set<Tag>; tags: Tag[] }

export function countFor(b: Board, t: Tag): number {
  return b.byTag.get(t) ?? 0;
}

export function hasTag(m: Map<Tag, number>, t: Tag): boolean {
  return m.has(t);
}

export function isSeen(s: Set<Tag>, t: Tag): boolean {
  return s.has(t);
}

export function distinctTags(b: Board): number {
  return new Set(b.tags).size;
}

export function copySeen(b: Board): Set<Tag> {
  return new Set(b.seen);
}

export function copyCounts(b: Board): Map<Tag, number> {
  return new Map(b.byTag);
}

export function tagList(b: Board): Tag[] {
  return Array.from(b.seen);
}

export function bumpCopy(b: Board, t: Tag): number {
  const m = new Map(b.byTag);
  m.set(t, 1);
  return b.byTag.get(t) ?? 0;
}

export function addCopy(b: Board, t: Tag): number {
  const s = new Set(b.seen);
  s.add(t);
  return b.seen.size;
}
