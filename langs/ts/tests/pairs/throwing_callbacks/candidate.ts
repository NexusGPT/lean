// Stage 5 rank 20: a throw inside a synchronous array-method callback is the unit's throw, and the statement holding the
// call is one opaque block, as a loop statement with a throw already is; a throwing unit, or an arrow that throws, handed
// to an outside call is the opaque function value it already is, its throw happening inside the outside's transition.
interface Sink { use(f: (n: number) => number): number; }

export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}

// changed behaviour: zero throws too: a WITNESS on an array holding 0
export function doubled(xs: number[]): number[] {
  const out = xs.map((x) => { if (x <= 0) throw new Error("negative"); return x * 2; });
  return out;
}

// a refactor: the unit called inside an arrow (the same call per element)
export function checked(xs: number[]): number[] {
  return xs.map((x) => check(x));
}

// changed behaviour: a different function value handed over: a WITNESS on the trace (the outside sees another value)
export function viaOutside(sink: Sink): number {
  return sink.use((n) => check(n) + 1);
}

// untouched: a throwing arrow handed to an outside call
export function viaArrow(sink: Sink, floor: number): number {
  return sink.use((n) => { if (n < floor) throw new Error("low"); return n; });
}
