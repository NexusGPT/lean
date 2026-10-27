// Stage 5 rank 18: a spread of a fixed tuple into an outside call is its elements in order, positional arguments, the
// tuple read once; an array spread keeps the sequence reading, an open tuple stays out.
interface Sink { send(k: string, n: number): boolean; log(a: string, b: string, c: number): void; }

// a refactor: the elements passed by position (the same call)
export function sendPair(sink: Sink, pair: [string, number]): boolean {
  return sink.send(pair[0], pair[1]);
}

// changed behaviour: the head and the tuple's first element swapped: a WITNESS on the trace
export function logWith(sink: Sink, head: string, rest: [string, number]): void {
  sink.log(rest[0], head, rest[1]);
}

// changed behaviour: the count no longer incremented: a WITNESS on the trace
export function sendBoth(sink: Sink, k: string, n: number): boolean {
  const pair: [string, number] = [k, n];
  return sink.send(...pair);
}

// untouched: a spread inside a conditional
export function maybeSend(sink: Sink, pair: [string, number], go: boolean): boolean {
  return go ? sink.send(...pair) : false;
}
