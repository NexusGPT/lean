// heap-3: a record spread read from keys the unit built, and a node read through a key tested for presence
export interface Rec { a: number; b: string }
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; count: number }

// the fields written out: the same keys in the same order
export function built(x: number, y: string): Rec {
  return { a: x, b: y + "!" };
}

// the declared fields copied by hand: the extra keys are dropped
export interface Bag { a: number; b: string; [k: string]: unknown }
export function copyBag(s: Bag): Bag { return { a: s.a, b: s.b }; }
export function bumpBag(s: Bag): Bag { return { a: s.a + 1, b: s.b }; }
export function copyRec(s: Rec): Rec { return { a: s.a, b: s.b }; }
// the spread dropped: an own key a holding undefined in s no longer overwrites a
export interface Opt { a?: number; b: string }
export function late(s: Opt): Rec { return { a: 1, b: s.b }; }
export function lateSame(s: Opt, n: number): Rec { return { a: n, ...s, b: s.b }; }

export function setA(s: Bag, n: number): Bag { return { ...s, a: n }; }

// the guard turned into a branch around the write
export function rename(box: Inbox, id: string, title: string): void {
  const chat = box.chats[id];
  if (chat) chat.title = title;
}

// `== null`: undefined when the key is absent, never null
export function clear(box: Inbox, id: string): void {
  const chat = box.chats[id];
  if (chat == null) return;
  chat.unread = 0;
}

// the guard dropped: an absent key throws a TypeError at the write
export function markRead(box: Inbox, id: string): number {
  const chat = box.chats[id];
  chat.unread = 0;
  return 1;
}

// untouched
export function touch(box: Inbox): void {
  box.count += 1;
}
