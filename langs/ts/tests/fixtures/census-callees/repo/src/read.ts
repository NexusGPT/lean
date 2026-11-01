import fs from "node:fs";
import { readFileSync } from "fs";
import { helper } from "./util";
function local(n: number): number { return n * 2; }
export function reads(p: string, q: string): string | undefined { return readFileSync?.(p, "utf8") ?? readFileSync?.(q, "utf8"); }
export function statement(p: string, on: boolean): number { let n = 0; on && (n = fs.readFileSync(p, "utf8").length); return n; }
export function exists(p: string): boolean { return fs.existsSync(p); }
export function pushes(xs: number[]): number | undefined { return xs.push?.(1); }
export function sameFile(n: number): number | undefined { return local?.(n); }
export function both(p: string, v: object): string | undefined { const t = readFileSync?.(p, "utf8"); return JSON.stringify?.(v) ?? t; }
export function project(n: number): number | undefined { return helper?.(n); }
export function outer(ps: string[]): number { return ps.map((p) => readFileSync?.(p, "utf8")).length; }
