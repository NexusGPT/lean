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
