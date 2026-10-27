/// <reference lib="es2023" />
// The stage 5 library rows (design/library-rows.md): mutators used as values, toString, toLocaleString, substr,
// findLast, matchAll and fill.

export function basename(path: string): string {
  return path.split("/").pop() ?? "index";
}

export function lastWord(words: string[]): string {
  const rest = [...words];
  const last = rest.pop();
  return `${last ?? ""}:${rest.length}`;
}

export function drop(xs: number[], i: number): string {
  const ys = [...xs];
  const removed = ys.splice(i, 1);
  return [...removed, ...ys].join(",");
}

export function flagText(flag: boolean): string {
  return `${flag}`;
}

export function labelOf(x: string | number): string {
  return `${x}`;
}

export function fmt(n: number): string {
  return "n=" + n.toLocaleString();
}

export function cut(s: string): string {
  return s.substr(1, 3);
}

export function lastOver(xs: number[], k: number): number | undefined {
  return xs.findLast((x) => x > k);
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
  return [...names].sort();
}

export function lastAt(xs: number[], k: number): number {
  return xs.findLastIndex((x) => x > k) + xs.lastIndexOf(k);
}

export function csv(names: string[]): string {
  return names.join();
}

export function bigText(n: bigint): string {
  return `${n}`;
}
