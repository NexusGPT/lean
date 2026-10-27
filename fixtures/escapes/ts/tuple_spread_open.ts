// expect: spread
// an open tuple [string, ...number[]] has no fixed element count: its spread into an outside call stays out
interface Sink { log(a: string, ...ns: number[]): void; }
export function logAll(sink: Sink, xs: [string, ...number[]]): void {
  sink.log(...xs);
}
