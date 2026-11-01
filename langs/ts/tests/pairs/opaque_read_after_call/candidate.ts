// A read after a call that may change the object it reads, in a form other than a field read (read-after-call graded:
// common.mjs worldForm 'value', translate.mjs handleNow; design/w1g-opaque-handed.md): from the call on the object is a
// handle the world holds, and the read takes ext_now_<T>(wld, x), then reads that value exactly
export type Box = { x: number; y: number };
export type Row = { n: number; tags: string[] };

// (a) a copy after the call, unchanged; a change outside it (the copy bound to a local, then returned)
export function snapshot(p: Box, g: (q: Box) => void): Box {
  g(p);
  return { ...p };
}

// (b) a change inside the read: another field of the copy taken from the handle
export function shifted(p: Box, g: (q: Box) => void): Box {
  g(p);
  return { ...p, y: p.y };
}

// (c) a planted change inside the read (a boundary constant of a library read)
export function planted(xs: number[], g: (a: number[]) => void): boolean {
  g(xs);
  return xs.includes(4);
}

// (d) the read moved before the call, a change outside the read: the world read tells the two apart
// (LEAN_BREAK=handle-value reads the object as it was before the call and the pair must go red)
export function moved(p: Box, g: (q: Box) => void): Box {
  const c = { ...p };
  g(p);
  return c;
}

// (e) a read through the holder of the array the call was handed: both reach one array
// (LEAN_BREAK=reach-closure misses it and the pair must go red)
export function holder(r: Row, g: (t: string[]) => void): number {
  const k = r.tags.length;
  g(r.tags);
  return k;
}

// (f) a new object a name holds, read after a call that may reach it by type: named by its site, so two new objects of
// one value are two (LEAN_BREAK=fresh-site names them by value alone and the pair must go red)
export function twoNew(g: (b: { n: number; tags: string[] }) => void): number {
  const a = { n: 0, tags: [] as string[] };
  const b = { n: 0, tags: [] as string[] };
  g(a);
  return a.n;
}

// (g) a write to a handle after the call is a transition: a later call that kept the object sees it; the value written
// bound another way outside the write (LEAN_BREAK=handle-write keeps the write from the world and the pair must go red)
export function written(make: () => Box, keep: (o: Box) => void, report: () => number, v: number): number {
  const w = v + 1;
  const o = make();
  keep(o);
  o.x = w;
  return report();
}
