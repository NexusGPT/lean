import { isPlainObject } from "./shape";
import { isTagged } from "./writer";
import { remember, isSmall, touchKept, hold, heldN } from "./keep";

export interface Rec { tags: string[]; meta: Record<string, unknown> }
export interface Held { n: number; meta: Record<string, unknown> }

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

// a later fact call (isSmall) after a call that kept rec (remember): neither writes what the run handed them
export function kept(rec: Rec): number {
  const n = rec.tags.length;
  const ok = isSmall(remember(rec));
  rec.tags.push("seen");
  return ok ? n + 1 : 0;
}

// the same move across touchKept, which clears the tags remember kept: a difference
export function keptWriter(rec: Rec): number {
  const n = rec.tags.length;
  const ok = touchKept(remember(rec));
  rec.tags.push("seen");
  return ok ? n + 1 : 0;
}

// no move, across touchKept: lane B records it writing what remember kept, the fact does not hold, the read stays refused
export function sameKeptWriter(rec: Rec): number {
  const ok = touchKept(remember(rec));
  rec.tags.push("seen");
  return ok ? rec.tags.length : 0;
}

// a write through what a fact call kept (hold writes none of what it is handed, it keeps it): the write is told to the
// world, which a later call (heldN) reads; the value written bound outside the write differs, the field restored after
// heldN, so only heldN sees it
export function keptWrite(b: Held, v: number): number {
  const w = v + 1;
  const old = b.n;
  hold(b);
  b.n = w;
  const r = heldN();
  b.n = old;
  return r;
}
