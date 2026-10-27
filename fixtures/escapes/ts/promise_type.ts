// expect: promise
// a promise read from a stored field is not a handle the unit received from a call: return the call, or make it async
export function wrap(x: { ready: Promise<number> }): Promise<number> {
  return x.ready;
}
