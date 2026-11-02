import { isPlainObject } from "./shape";
import { isTagged } from "./writer";
import { remember, isSmall, touchKept } from "./keep";

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

export function kept(rec: Rec): number {
  const ok = isSmall(remember(rec));
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}

export function keptWriter(rec: Rec): number {
  const ok = touchKept(remember(rec));
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}

export function sameKeptWriter(rec: Rec): number {
  const good = touchKept(remember(rec));
  rec.tags.push("seen");
  return good ? rec.tags.length : 0;
}
