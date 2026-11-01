import { isPlainObject } from "./shape";
import { isTagged } from "./writer";

export interface Rec { tags: string[]; meta: Record<string, unknown> }

export function tags(rec: Rec): number {
  const ok = isPlainObject(rec);
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}

export function tagsWriter(rec: Rec): number {
  const ok = isTagged(rec);
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}

export function sameWriter(rec: Rec): number {
  const good = isTagged(rec);
  rec.tags.push("seen");
  return good ? rec.tags.length : 0;
}
