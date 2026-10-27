/// <reference path="./types.d.ts" />
// A caller passes arguments by position: a parameter rename alone is not a signature change. A changed parameter type
// or a changed parameter decorator still is, and names swapped over an unchanged body are a changed function.
import { Param, Post } from "framework";
export class Lookup {
  fetch(id: string, _region?: string): number { return id.length; }
}
export function total(values: number[], factor: number): number { let s = 0; for (const x of values) { s = s + x * factor; } return s; }
export function width(size: number | null, pad: number): number { if (size === null) return pad; return size + pad; }
export interface Box { n: number; tags: string[] }
export function bump(target: Box, step: number): number { target.n = target.n + step; return target.n; }
export function diff(b: number, a: number): number { return a - b; }
export class Routes {
  @Post()
  close(@Param("conversationId", "Resolve") conversationId: string): number { return conversationId.length; }
  @Post()
  open(@Param("conversationId", "Resolve") id: string): number { return id.length + 1; }
}
