// expect: callback-form
// a rest element inside the destructured element of an effectful callback: name the fields you read
interface Sink { note(k: string): void; }
type Item = { id: string; n: number; tag?: string };
export function keep(sink: Sink, xs: Item[]): Item[] {
  return xs.map(({ id, ...rest }) => { sink.note(id); return { id, ...rest }; });
}
