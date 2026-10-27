/// <reference lib="es2023" />
// The stage 5 library rows (design/library-rows.md): mutators used as values, toString, toLocaleString, substr,
// findLast, matchAll and fill.

export function basename(path: string): string {
  return path.split("/").at(-1) ?? "index";
}

export function lastWord(words: string[]): string {
  const rest = [...words];
  const last = rest.shift();
  return `${last ?? ""}:${rest.length}`;
}

export function drop(xs: number[], i: number): string {
  const kept = [...xs];
  const taken = kept.splice(i, 1);
  return taken.concat(kept).join(",");
}

export function flagText(flag: boolean): string {
  return flag.toString();
}

export function labelOf(x: string | number): string {
  return x.toString();
}

export function fmt(n: number): string {
  return `n=${n.toLocaleString()}`;
}

export function cut(s: string): string {
  return s.substring(1, 3);
}

export function lastOver(xs: number[], k: number): number | undefined {
  return xs.toReversed().find((x) => x > k);
}

export function countAs(s: string): number {
  let n = 0;
  for (const m of s.matchAll(/a+/g)) n += m.length;
  return n;
}

export function zeros(xs: number[]): string {
  return [...xs].fill(0, 1).join(",");
}

export function whereX(s: string): number {
  return s.search(/x+/);
}

export function lowerName(name: string): string {
  return name.toLocaleLowerCase();
}

export function sortedNames(names: string[]): string[] {
  return names.toSorted();
}

export function lastAt(xs: number[], k: number): number {
  return xs.findLastIndex((x) => x > k) + xs.lastIndexOf(k);
}

export function csv(names: string[]): string {
  return names.toString();
}

export function bigText(n: bigint): string {
  return n.toString();
}
