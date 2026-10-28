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
