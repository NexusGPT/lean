import { isPlainObject } from "./shape";
import { isTagged } from "./writer";

export interface Rec { tags: string[]; meta: Record<string, unknown> }

// the length read before a guard that writes none of what it is handed: the read may move across it
export function tags(rec: Rec): number {
  const n = rec.tags.length;
  const ok = isPlainObject(rec);
  rec.tags.push("seen");
  return ok ? n + 1 : 0;
}

// the same move across a guard that clears the tags: a difference
export function tagsWriter(rec: Rec): number {
  const n = rec.tags.length;
  const ok = isTagged(rec);
  rec.tags.push("seen");
  return ok ? n + 1 : 0;
}

// no move, a guard that writes: lane B's record confirms no fact, the read after the call stays refused
export function sameWriter(rec: Rec): number {
  const ok = isTagged(rec);
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}
