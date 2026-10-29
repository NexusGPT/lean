// heap-3: a record spread read from keys the unit built, and a node read through a key tested for presence
export interface Rec { a: number; b: string }
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; count: number }

// a spread of a const the function built from a literal: its keys are the literal's
export function built(x: number, y: string): Rec {
  const base = { a: x, b: y };
  return { ...base, b: y + "!" };
}

// an open record copied by a spread: an uninterpreted copy of s, which carries what s carries beyond its fields
export interface Bag { a: number; b: string; [k: string]: unknown }
export function copyBag(s: Bag): Bag { return { ...s }; }
export function bumpBag(s: Bag): Bag { return { ...s, a: s.a + 1 }; }
// a plain record copied by a spread
export function copyRec(s: Rec): Rec { return { ...s }; }
// a record spread after other members: the members up to it are one merge of their values in order
export interface Opt { a?: number; b: string }
export function late(s: Opt): Rec { return { a: 1, ...s, b: s.b }; }
export function lateSame(s: Opt, n: number): Rec { return { a: n, ...s, b: s.b }; }

// the same copy on both sides
export function setA(s: Bag, n: number): Bag { return { ...s, a: n }; }

// a node read through a key, guarded by its truthiness
export function rename(box: Inbox, id: string, title: string): void {
  const chat = box.chats[id];
  if (!chat) return;
  chat.title = title;
}

// the same guard by `=== undefined`
export function clear(box: Inbox, id: string): void {
  const chat = box.chats[id];
  if (chat === undefined) return;
  chat.unread = 0;
}

// guarded; the candidate drops the guard
export function markRead(box: Inbox, id: string): number {
  const chat = box.chats[id];
  if (!chat) return 0;
  chat.unread = 0;
  return 1;
}

// untouched
export function touch(box: Inbox): void {
  box.count += 1;
}
