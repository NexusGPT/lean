/// <reference path="./types.d.ts" />
// The decorator contract table (translate/decorators.json): a guard gates a route, a pipe transforms its parameter, a
// metadata writer and its reader share one cell of the world, and the two prototype idioms read exactly on records.
import { Body, Get, Param, ParseIntPipe, Post, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export const ROLE = "role";
export interface Point { x: number; y: number; }

export class Admin {
  @UseGuards(AuthGuard("jwt"))
  @Get()
  read(): number { return 1; }

  @Get(":id")
  byId(@Param("id", ParseIntPipe) id: number): number { return id + 1; }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  total(@Body() n: number): number { return n * 2; }

  @SetMetadata(ROLE, "admin")
  @Get("list")
  list(): number { return 3; }

  @Get("health")
  health(): string { return "ok"; }
}

export function allows(handler: object): boolean {
  const role = Reflect.getMetadata(ROLE, handler);
  return role === "admin";
}

export function isPlain(p: Point): boolean { return Object.getPrototypeOf(p) === Object.prototype; }

export function hasKey(d: Record<string, number>, k: string): boolean { return Object.prototype.hasOwnProperty.call(d, k); }
