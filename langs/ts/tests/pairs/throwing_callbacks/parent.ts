// Stage 5 rank 20: a throw inside a synchronous array-method callback is the unit's throw, and the statement holding the
// call is one opaque block, as a loop statement with a throw already is; a throwing unit, or an arrow that throws, handed
// to an outside call is the opaque function value it already is, its throw happening inside the outside's transition.
interface Sink { use(f: (n: number) => number): number; }

export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}

// a throw inside a map callback: the statement is one opaque block
export function doubled(xs: number[]): number[] {
  const out = xs.map((x) => { if (x < 0) throw new Error("negative"); return x * 2; });
  return out;
}

// the throwing unit handed to an array method: its fault runs through the loop
export function checked(xs: number[]): number[] {
  return xs.map(check);
}

// the throwing unit handed to an outside call: an opaque value named by its text
export function viaOutside(sink: Sink): number {
  return sink.use(check);
}

// untouched: a throwing arrow handed to an outside call
export function viaArrow(sink: Sink, floor: number): number {
  return sink.use((n) => { if (n < floor) throw new Error("low"); return n; });
}
