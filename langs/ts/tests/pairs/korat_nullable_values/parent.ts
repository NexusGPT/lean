// lane B's enumerated heaps (exec/korat.mjs, design/heap-stage5.md 16c): a Set whose items may be null draws the pool's
// objects and the absent value, and a Map whose values are records draws them from the pool as a record field does, so
// an item or a value may be the very object an argument or a key holds, and two keys may hold one object. The heap core
// leaves both out (section 16: a Set of optional items, a Map's reference values), so the pair checks lane B alone.
// knowsTag: the Map field placed first in a record of three slots, which the odometer reached past the suite's 30 inputs.
export interface Tag { name: string }
export interface Board { byTag: Map<Tag, number>; seen: Set<Tag>; tags: Tag[] }

export function isSeenOrNone(s: Set<Tag | null>, t: Tag): boolean {
  return s.has(t);
}

export function holdsNone(s: Set<Tag | null>): boolean {
  return s.has(null);
}

export function isOwnValue(m: Map<Tag, Tag>, t: Tag): boolean {
  return m.get(t) === t;
}

export function distinctValues(m: Map<string, Tag>): number {
  return new Set(m.values()).size;
}

export function valueCount(m: Map<string, Tag>): number {
  return m.size;
}

export function knowsTag(b: Board, t: Tag): boolean {
  return b.byTag.has(t);
}
