// expect: callback-form
// a rest parameter on an effectful callback stays out
interface Sink { note(k: string): void; }
export function noteRest(sink: Sink, xs: string[]): string[] {
  return xs.map((...args) => { sink.note(String(args[0])); return String(args[0]); });
}
