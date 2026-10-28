/// <reference lib="es2023" />
// The admitted library member rows (design/library-rows.md, "2026-10-28 library members"): a locale read inside an
// iteration callback, and matchAll on a pattern held in a name that nothing in the file advances.

const TOKEN = /\{\{(\w+)\}\}/g;
const WORD = /[a-z]+/g;

export function lowerAll(names: string[]): string[] {
  return names.map((n) => n.toLocaleUpperCase());
}

export function hasName(names: string[], key: string): boolean {
  return names.some((n) => n.toLocaleLowerCase() === key);
}

export function labelsMap(xs: number[]): string[] {
  return xs.map((value) => value.toLocaleString());
}

export function nestedCount(rows: string[][], key: string): number {
  return rows.map((r) => r.filter((x) => x.toLocaleLowerCase() === key).length).reduce((a, b) => a + b, 0);
}

export function tokens(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(TOKEN)) out.push(m[1]);
  return out;
}

export function wordLetters(s: string): number {
  let n = 0;
  for (const m of s.matchAll(WORD)) n += 1;
  return n;
}

export function sepCount(s: string, src: string): number {
  return Array.from(s.matchAll(new RegExp(src, "g"))).length;
}
