// Stage 5 rank 16: a type alias or an interface declared inside a function has no run-time meaning (erased); every use
// of it is read through the checker. `import.meta` is a fact of the world: a world read.

// a local alias and a local interface, used by the body
export function parse(line: string): { key: string; n: number } {
  type Pair = { key: string; n: number };
  interface Opts { sep: string }
  const opts: Opts = { sep: "=" };
  const at = line.indexOf(opts.sep);
  const p: Pair = { key: at < 0 ? line : line.slice(0, at), n: at < 0 ? 0 : line.slice(at + 1).length };
  return p;
}

// a local interface as the result's shape
export function summary(xs: number[]): { total: number; count: number } {
  interface Stats { total: number; count: number }
  let total = 0;
  for (const x of xs) total = total + x;
  const s: Stats = { total, count: xs.length };
  return s;
}

// the module's own URL: a world read
export function here(): string {
  return (import.meta as { url: string }).url;
}

// untouched: a local union alias
export function sizeOf(n: number): string {
  type Kind = "small" | "large";
  const k: Kind = n < 10 ? "small" : "large";
  return k;
}

// a local alias to be renamed
export function widen(k: number): number {
  type Width = number;
  const w: Width = k * 2;
  return w + 1;
}
