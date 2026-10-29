// a wrong after: the proof must refute it with a WITNESS
// apply-site: a forEach whose callback calls push through apply converts to a counted for; the converter edits the
// file as written, so the call through apply is copied byte for byte (design/push-apply.md)
export function pairs(xs: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (x === undefined) continue;
    out.push.apply(out, [x, i]);
  }
  return out;
}

export function tagged(xs: string[], tags: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (x === undefined) continue;
    if (x === "") continue;
    out.push.call(out, x + i);
  }
  out.push.apply(out, tags.slice(1));
  return out;
}
