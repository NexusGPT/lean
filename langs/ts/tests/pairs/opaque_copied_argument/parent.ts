// A new object holding objects the caller holds, handed to a call that may write or keep it (copied-argument graded:
// translate.mjs mixedTree, design/w1g-opaque-handed.md)
export type Data = { n: number };
export type Row = { data: Data; extra: Data; n: number; tags: string[] };
export type Sink = (o: { data: Data; extra: Data; count: number; tags: string[] }) => void;
export type Pair = (o: { x: string[]; y: string[] }) => void;

// (a) the handed literal unchanged, a change outside it (the count computed another way)
export function report(r: Row, g: Sink): number {
  const count = r.n + r.n;
  g({ data: r.data, extra: r.extra, count, tags: [] });
  return count;
}

// (b) a change inside the handed literal: the two existing parts swapped
export function swapped(r: Row, g: Sink): void {
  g({ data: r.data, extra: r.extra, count: r.n, tags: [] });
}

// (c) a planted change inside the handed literal (a boundary constant)
export function planted(r: Row, g: Sink): void {
  g({ data: r.data, extra: r.extra, count: r.n + 1, tags: [] });
}

// (d) one existing array in two slots against the array and a new copy of it (the same value): the skeleton tells them
// apart (LEAN_BREAK=handed-skeleton drops it and the pair must go red)
export function shared(r: Row, g: Pair): number {
  g({ x: r.tags, y: r.tags });
  return r.tags.length;
}

// (e) a same-file call's result handed to the outside: keyed by the code the callee reaches (amendment A3), so the
// callee returning the caller's own object against returning a copy of it is a change (LEAN_BREAK=handed-call drops
// the key and the pair must go red)
export type Person = { id: string; n: number };
function principalOf(p: Person): Person {
  return p;
}
export function viaCallee(p: Person, g: (x: Person) => void): string {
  g(principalOf(p));
  return p.id;
}
