// Stage 5 rank 13: an effectful array callback whose element parameter is destructured or carries a default the
// element type never takes. The loop binds the pattern from the element at each step, as `for (const { id } of xs)` does.
interface Sink { send(id: string, n: number): boolean; note(k: string): void; }
type Item = { id: string; n: number; tag?: string };

// sends every item with a positive count and returns the ids that were accepted: the element destructured
export function sendAll(sink: Sink, xs: Item[]): string[] {
  return xs.filter(({ id, n }) => n > 0 && sink.send(id, n)).map(({ id }) => id);
}

// notes every key of the entries: an array pattern over tuples
export function noteKeys(sink: Sink, entries: [string, number][]): string[] {
  return entries.map(([k, v]) => {
    sink.note(k);
    return `${k}=${v}`;
  });
}

// the labels of the items, with a default the element never takes (the array holds no undefined)
export function labels(sink: Sink, xs: Item[]): string[] {
  return xs.map((x = { id: "", n: 0 }) => {
    sink.note(x.id);
    return x.tag ?? x.id;
  });
}

// the ids with a count above the floor: the element destructured with a default inside the pattern
export function above(sink: Sink, xs: Item[], floor: number): string[] {
  return xs.map(({ id, n, tag = "none" }) => {
    if (n > floor) { sink.note(tag); return id; }
    return "";
  });
}

// untouched: the ids of the items, the element destructured, no effect
export function ids(xs: Item[]): string[] {
  return xs.map(({ id }) => id);
}
