// A method call on an opaque value, then reads of a value of the same name (design/top-blockers.md, class-and-this)
export function shadowed(e: any, xs: readonly any[]): number {
  e.preventDefault();
  return xs.filter((e) => e.ok).length;
}

export function aliased(e: any): number {
  const f = e;
  e.preventDefault();
  return f.defaultPrevented ? 1 : 0;
}

export function looped(e: any, xs: readonly number[]): number {
  let n = 0;
  for (const x of xs) {
    if (e.done) n = n + x;
    e.step();
  }
  return n;
}

export function moved(e: any, text: string): number {
  e.preventDefault();
  return text.trim().length;
}
