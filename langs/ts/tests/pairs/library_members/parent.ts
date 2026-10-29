/// <reference lib="es2023" />
// The admitted library member rows (design/library-rows.md, "2026-10-28 library members"): a locale read inside an
// iteration callback, matchAll on a pattern held in a name that nothing in the file advances, and a member of a type
// that reaches a module the program cannot resolve.
import type { Request } from "express";

type Req = Omit<Request, "user"> & { user: { id: string } };

const TOKEN = /\{\{(\w+)\}\}/g;
const WORD = /[a-z]+/g;

export function lowerAll(names: string[]): string[] {
  return names.map((n) => n.toLocaleLowerCase());
}

export function hasName(names: string[], key: string): boolean {
  return names.some((n) => n.toLocaleLowerCase() === key);
}

export function labelsMap(xs: number[]): string[] {
  return xs.map((x) => x.toLocaleString());
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
  for (const m of s.matchAll(WORD)) n += m[0].length;
  return n;
}

export function sepCount(s: string, src: string): number {
  return Array.from(s.matchAll(new RegExp(src, "g"))).length;
}

export function providerOf(req: Req): string {
  return req.params?.provider ?? "none";
}

export function pageOf(req: Req): string {
  return req.query?.page ?? "1";
}
