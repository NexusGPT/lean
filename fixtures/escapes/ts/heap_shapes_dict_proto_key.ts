// expect: prototype
// a record stored under a key that may be '__proto__' replaces the dictionary's prototype instead of making a key
// (the setter of Object.prototype.__proto__ takes an object): the heap core's dictionary of records reads a key write
// only when the key cannot be that name
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; active: string }
export function open(b: Inbox, k: string, t: string): void {
  b.chats[k] = { title: t, unread: 0 };
}
