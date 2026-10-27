// Stage 5 rank 13: an effectful array callback whose element parameter is destructured or carries a default the
// element type never takes. The loop binds the pattern from the element at each step, as `for (const { id } of xs)` does.
interface Sink { send(id: string, n: number): boolean; note(k: string): void; }
type Item = { id: string; n: number; tag?: string };

// changed behaviour: a zero count is sent too (n >= 0): a WITNESS on an item with n = 0
export function sendAll(sink: Sink, xs: Item[]): string[] {
  return xs.filter(({ id, n }) => n >= 0 && sink.send(id, n)).map(({ id }) => id);
}

// a refactor: the same loop written as a for-of with the same array pattern, pushing into a result
export function noteKeys(sink: Sink, entries: [string, number][]): string[] {
  const out: string[] = [];
  for (const [k, v] of entries) {
    sink.note(k);
    out.push(`${k}=${v}`);
  }
  return out;
}

// a refactor: the default removed (it never applied), the same reads
export function labels(sink: Sink, xs: Item[]): string[] {
  return xs.map((x) => {
    sink.note(x.id);
    return x.tag ?? x.id;
  });
}

// changed behaviour: the note carries the id, not the tag, and a low item yields its tag: a WITNESS on the trace and the value
export function above(sink: Sink, xs: Item[], floor: number): string[] {
  return xs.map(({ id, n, tag = "none" }) => {
    if (n > floor) { sink.note(id); return id; }
    return tag;
  });
}

// untouched: the ids of the items, the element destructured, no effect
export function ids(xs: Item[]): string[] {
  return xs.map(({ id }) => id);
}
