import fs from "node:fs";
import { readFileSync } from "fs";
import { helper, slot } from "./util";
export interface Doc { path: string; seen: string[]; meta: Record<string, unknown> }
function local(n: number): number { return n * 2; }
export function reads(ds: Doc[], q: Doc): string { const t = readFileSync(ds[slot()], "utf8") + readFileSync(q, "utf8"); q.seen.push(t); return t; }
export function statement(p: string): number { let n = 0; for (var i = fs.readFileSync(p, "utf8").length; i < 3; i++) n++; return n; }
export function exists(p: string): boolean { return fs.existsSync(p); }
export function pushes(xs: number[]): number | undefined { return xs.push?.(1); }
export function sameFile(n: number): number | undefined { return local?.(n); }
export function both(v: Doc, api: any, ps: string[]): number { api.save(v); v.seen.push("x"); return ps.map((p) => readFileSync?.(p, "utf8")).length; }
export function project(d: Doc & { n: number }, f: (x: number) => number): number { const n = helper(d, f); d.seen.push("x"); return n; }
export function projectFact(d: Doc & { n: number }): number { const n = helper(d); d.seen.push("x"); return n; }
export function outer(ds: Doc[]): number { return ds.map((d) => { const t = readFileSync(d, "utf8"); d.seen.push(t); return t; }).length; }
