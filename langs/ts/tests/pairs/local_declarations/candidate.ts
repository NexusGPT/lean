// Stage 5 rank 16: a type alias or an interface declared inside a function has no run-time meaning (erased); every use
// of it is read through the checker. `import.meta` is a fact of the world: a world read.

// a refactor: the alias and the interface written inline (the same values)
export function parse(line: string): { key: string; n: number } {
  const opts: { sep: string } = { sep: "=" };
  const at = line.indexOf(opts.sep);
  const p: { key: string; n: number } = { key: at < 0 ? line : line.slice(0, at), n: at < 0 ? 0 : line.slice(at + 1).length };
  return p;
}

// changed behaviour: the count is one more: a WITNESS on any input
export function summary(xs: number[]): { total: number; count: number } {
  interface Stats { total: number; count: number }
  let total = 0;
  for (const x of xs) total = total + x;
  const s: Stats = { total, count: xs.length + 1 };
  return s;
}

// changed behaviour: a fragment appended to the URL: a WITNESS
export function here(): string {
  return (import.meta as { url: string }).url + "#";
}

// untouched: a local union alias
export function sizeOf(n: number): string {
  type Kind = "small" | "large";
  const k: Kind = n < 10 ? "small" : "large";
  return k;
}

// a refactor: the alias renamed
export function widen(k: number): number {
  type W = number;
  const w: W = k * 2;
  return w + 1;
}
