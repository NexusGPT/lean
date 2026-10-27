// expect: callback-form
// a default on the element where the array may hold undefined: the default applies, so it is not read as the element
interface Sink { note(k: string): void; }
type Item = { id: string; n: number };
export function noteAll(sink: Sink, xs: (Item | undefined)[]): string[] {
  return xs.map((x = { id: "none", n: 0 }) => { sink.note(x.id); return x.id; });
}
