// stage 5 step 16 (design/heap-stage5.md section 16): a Map keyed by records and a Set of records hold their keys and
// items by identity; the copy forms new Set, new Map and Array.from allocate a fresh cell of the source's contents
export interface Tag { name: string }
export interface Board { byTag: Map<Tag, number>; seen: Set<Tag>; tags: Tag[] }

export function countFor(b: Board, t: Tag): number {
  const n = b.byTag.get(t);
  return n ?? 0;
}

export function hasTag(m: Map<Tag, number>, t: Tag): boolean {
  return m.has({ name: t.name });
}

export function isSeen(s: Set<Tag>, t: Tag): boolean {
  return s.has({ name: t.name });
}

export function distinctTags(b: Board): number {
  const s = new Set(b.tags);
  return s.size;
}

export function copySeen(b: Board): Set<Tag> {
  const s = new Set(b.seen);
  return s;
}

export function copyCounts(b: Board): Map<Tag, number> {
  const m = new Map(b.byTag);
  return m;
}

export function tagList(b: Board): Tag[] {
  const xs = Array.from(b.seen);
  return xs;
}

export function bumpCopy(b: Board, t: Tag): number {
  const m = new Map(b.byTag);
  m.set(t, 1);
  return m.get(t) ?? 0;
}

export function addCopy(b: Board, t: Tag): number {
  const s = new Set(b.seen);
  s.add(t);
  return s.size;
}
