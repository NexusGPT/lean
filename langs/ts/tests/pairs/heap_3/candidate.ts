// heap-3: a record spread read from keys the unit built, and a node read through a key tested for presence
export interface Rec { a: number; b: string }
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; count: number }

// the fields written out: the same keys in the same order
export function built(x: number, y: string): Rec {
  return { a: x, b: y + "!" };
}

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
