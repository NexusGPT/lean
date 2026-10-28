/// <reference path="./types.d.ts" />
// A changed TypeScript signature is an interface change, never a proof: a parameter type read as the same Dafny
// type (undefined against null, one absence), and a parameter decorator the framework runs before the call.
import { Param, Post } from "framework";
export function reach(surface: string | undefined): number { if (surface === undefined) return 0; return surface.length; }
export class Routes {
  @Post()
  close(@Param("conversationId", "Resolve") id: string): number { return id.length; }
  @Post()
  open(@Param("conversationId", "Resolve") id: string): number { return id.length + 1; }
}
