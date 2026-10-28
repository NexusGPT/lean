// expect: callback-form
// a third parameter (the array itself) on an effectful callback stays out
interface Sink { note(k: string): void; }
export function noteWithArray(sink: Sink, xs: string[]): string[] {
  return xs.map((x, i, all) => { sink.note(x); return `${x}:${i}/${all.length}`; });
}
