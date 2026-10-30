// A method call on an opaque value, then reads of a value of the same name (design/opaque-receiver.md)
export function shadowed(e: any, xs: readonly any[]): number {
  e.preventDefault();
  return xs.filter((item) => item.ok).length;
}

export function aliased(e: any): number {
  const f = e;
  const d = f.defaultPrevented;
  e.preventDefault();
  return d ? 1 : 0;
}

export function looped(e: any, xs: readonly number[]): number {
  let n = 0;
  const d = e.done;
  for (const x of xs) {
    if (d) n = n + x;
    e.step();
  }
  return n;
}

export function moved(e: any, text: string): number {
  const n = text.trim().length;
  e.preventDefault();
  return n;
}
