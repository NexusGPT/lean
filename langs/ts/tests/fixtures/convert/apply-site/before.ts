// apply-site: a forEach whose callback calls push through apply converts to a counted for; the converter edits the
// file as written, so the call through apply is copied byte for byte (design/push-apply.md)
export function pairs(xs: number[]): number[] {
  const out: number[] = [];
  xs.forEach((x, i) => { out.push.apply(out, [x, i]); });
  return out;
}

export function tagged(xs: string[], tags: string[]): string[] {
  const out: string[] = [];
  xs.forEach((x, i) => {
    if (x === "") return;
    out.push.call(out, x + i);
  });
  out.push.apply(out, tags);
  return out;
}
