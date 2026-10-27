// Stage 5 rank 18: a spread of a fixed tuple into an outside call is its elements in order, positional arguments, the
// tuple read once; an array spread keeps the sequence reading, an open tuple stays out.
interface Sink { send(k: string, n: number): boolean; log(a: string, b: string, c: number): void; }

// a pair spread into the two parameters
export function sendPair(sink: Sink, pair: [string, number]): boolean {
  return sink.send(...pair);
}

// a spread after a plain argument
export function logWith(sink: Sink, head: string, rest: [string, number]): void {
  sink.log(head, ...rest);
}

// the tuple built on the spot, then spread
export function sendBoth(sink: Sink, k: string, n: number): boolean {
  const pair: [string, number] = [k, n + 1];
  return sink.send(...pair);
}

// untouched: a spread inside a conditional
export function maybeSend(sink: Sink, pair: [string, number], go: boolean): boolean {
  return go ? sink.send(...pair) : false;
}
