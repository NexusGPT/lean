// heap shapes: writes through a node a parameter holds, read by the heap core as steps on the explicit object graph
// (design/heap-stage5.md "Heap shapes")
export interface Hdrs { auth: string; agent: string }
export interface Req { url: string; headers: Hdrs }

// shape 1: Object.assign with a literal source is a sequence of field writes on the target's node
export function sign(r: Req, token: string): void {
  Object.assign(r.headers, { auth: token, agent: "lean" });
}

export function stamp(r: Req, token: string): void {
  Object.assign(r.headers, { auth: token, agent: "lean" });
}

// shape 2: a write through a call result: a same-file unit that returns a field path of its parameters (or of `this`)
// returns a node of the caller's graph, and the write is a step on that node
export interface Run { id: number; status: string }
export interface Book { current: Run; other: Run }

export function pickRun(b: Book, first: boolean): Run {
  return first ? b.current : b.other;
}

export function finish(b: Book): void {
  pickRun(b, true).status = "done";
}

export function close(b: Book): void {
  pickRun(b, false).status = "closed";
  pickRun(b, false).id += 1;
}

export class Desk {
  open: Run = { id: 0, status: "new" };
  current(): Run { return this.open; }
  reset(): void { this.current().status = "new"; }
}

// shape 3: an index write with a string key on a dictionary a parameter's node holds is DictSet_ on that node (a new
// key goes last: the key order is observed)
export interface Call { url: string; headers: Record<string, string> }

export function cacheOff(c: Call): void {
  c.headers["Cache-Control"] = "no-cache";
}

export function tag(c: Call, k: string, v: string): void {
  c.headers[k] = v;
  c.headers["X-Seen"] = "1";
}

// shape 4: a const name for a node a parameter holds; splice on it as the library row says, its index read exactly
// (`>>> 0` makes the -1 of a missing item 4294967295, which deletes nothing)
export interface Bus { names: string[]; count: number }

export function off(b: Bus, name: string): void {
  const names = b.names;
  names.splice(names.indexOf(name) >>> 0, 1);
}

export function drop(b: Bus, name: string): void {
  const names = b.names;
  names.splice(names.indexOf(name) >>> 0, 1);
  b.count -= 1;
}

// shape 5: `===` between two heap nodes is node identity, Ref equality: an alias keeps it, a copy breaks it
export interface Tag { name: string }
export interface Post { tag: Tag; pinned: Tag }

export function isPinned(p: Post): boolean {
  return p.tag === p.pinned;
}

export function pin(p: Post): boolean {
  p.pinned = p.tag;
  return p.pinned === p.tag;
}

export function share(p: Post): boolean {
  p.pinned = p.tag;
  return p.pinned === p.tag;
}

// shape 6: a dictionary of records a parameter's node holds: the value under a key is a node, DictGet_ then a field
// step; a key the unit has not written may be missing (a TypeError) or a name of Object.prototype, and a read of it
// marks the world, so a proof holds only where the unit wrote the key
export interface Chat { title: string; unread: number }
export interface Inbox { chats: Record<string, Chat>; active: string }

export function seed(b: Inbox, t: string): void {
  b.chats["draft"] = { title: t, unread: 0 };
  b.chats["draft"].unread = 5;
}

export function later(b: Inbox, t: string): number {
  b.chats["draft"] = { title: t, unread: 0 };
  const n = b.chats["draft"].unread;
  b.active = t;
  return n;
}

export function named(b: Inbox, t: string): void {
  b.chats["draft"] = { title: t, unread: 0 };
  b.chats["draft"].unread = 1;
}

export function retitle(b: Inbox, id: string, t: string): void {
  const chat = b.chats[id];
  chat.title = t;
  chat.unread += 1;
}
