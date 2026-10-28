// heap shapes: writes through a node a parameter holds, read by the heap core as steps on the explicit object graph
// (design/heap-stage5.md "Heap shapes")
export interface Hdrs { auth: string; agent: string }
export interface Req { url: string; headers: Hdrs }

// shape 1: the agent write dropped (WITNESS); the literal's keys in the other order (the same writes: proved)
export function sign(r: Req, token: string): void {
  Object.assign(r.headers, { auth: token });
}

export function stamp(r: Req, token: string): void {
  Object.assign(r.headers, { agent: "lean", auth: token });
}

// shape 2: finish writes the other node (WITNESS); close moves the count first and writes the status through the path
// the call returns (the same writes on the same node: proved)
export interface Run { id: number; status: string }
export interface Book { current: Run; other: Run }

export function pickRun(b: Book, first: boolean): Run {
  return first ? b.current : b.other;
}

export function finish(b: Book): void {
  pickRun(b, false).status = "done";
}

export function close(b: Book): void {
  pickRun(b, false).id += 1;
  b.other.status = "closed";
}

export class Desk {
  open: Run = { id: 0, status: "new" };
  current(): Run { return this.open; }
  reset(): void { this.current().status = "new"; }
}

// shape 3: cacheOff names the key first (the same write: proved); tag writes the two keys in the other order (a new key
// goes last, so the key order differs: WITNESS)
export interface Call { url: string; headers: Record<string, string> }

export function cacheOff(c: Call): void {
  const key = "Cache-Control";
  c.headers[key] = "no-cache";
}

export function tag(c: Call, k: string, v: string): void {
  c.headers["X-Seen"] = "1";
  c.headers[k] = v;
}

// shape 4: off drops the `>>> 0` (a missing item's -1 now deletes the last name: WITNESS); drop splices through the
// parameter's own path where the parent names the node first (the same steps on the same node: proved)
export interface Bus { names: string[]; count: number }

export function off(b: Bus, name: string): void {
  const names = b.names;
  names.splice(names.indexOf(name), 1);
}

export function drop(b: Bus, name: string): void {
  b.names.splice(b.names.indexOf(name) >>> 0, 1);
  b.count -= 1;
}

// shape 5: pin stores a copy of the tag (a new node: `===` is false where the parent's is true, WITNESS); share stores
// the tag through a const name for it and compares that name (the same node: proved)
export interface Tag { name: string }
export interface Post { tag: Tag; pinned: Tag }

export function isPinned(p: Post): boolean {
  return p.tag === p.pinned;
}

export function pin(p: Post): boolean {
  p.pinned = { name: p.tag.name };
  return p.pinned === p.tag;
}

export function share(p: Post): boolean {
  const t = p.tag;
  p.pinned = t;
  return t === p.pinned;
}
