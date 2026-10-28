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
