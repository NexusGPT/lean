// heap-3: a record spread read from keys the unit built, and a node read through a key tested for presence
export interface Rec { a: number; b: string }
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; count: number }

// a spread of a const the function built from a literal: its keys are the literal's
export function built(x: number, y: string): Rec {
  const base = { a: x, b: y };
  return { ...base, b: y + "!" };
}

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
