/// <reference path="./types.d.ts" />
// A caller passes arguments by position: a parameter rename alone is not a signature change. A changed parameter type
// or a changed parameter decorator still is, and names swapped over an unchanged body are a changed function.
import { Param, Post } from "framework";
export class Lookup {
  fetch(id: string, region?: string): number { return id.length; }
}
export function total(items: number[], rate: number): number { let s = 0; for (const x of items) { s = s + x * rate; } return s; }
export function width(value: number | undefined, pad: number): number { if (value === undefined) return pad; return value + pad; }
export interface Box { n: number; tags: string[] }
export function bump(box: Box, by: number): number { box.n = box.n + by; return box.n; }
export function diff(a: number, b: number): number { return a - b; }
export function shadow(a: number, on: boolean): number { if (on) { const b = 1; return a + b; } return a; }
export interface Pt { b: number; c: number }
export function fieldname(p: Pt, a: number): number { return p.b + a; }
export class Routes {
  @Post()
  close(@Param("conversationId", "ResolveWritable") id: string): number { return id.length; }
  @Post()
  open(@Param("conversationId", "Resolve") id: string): number { return id.length + 1; }
}
