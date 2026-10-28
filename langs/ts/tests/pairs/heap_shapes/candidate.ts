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
