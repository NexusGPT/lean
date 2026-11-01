// A unit whose throw rests on the world's answer: lean's fake for the package answers a handle, the unit throws on it.
// The call asked the world, so the throw is no fact about the declaration (LEAN_BREAK=closed-call claims it).
import { measure } from "lean-declared-fake";

export function width(s: string): number {
  const w = measure(s);
  if (typeof w !== "number") throw new Error("measure answered no number");
  return w;
}
