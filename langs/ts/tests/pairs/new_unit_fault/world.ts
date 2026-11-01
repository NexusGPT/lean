// A unit whose throw rests on the world's answer: lean's fake for the package answers a handle, the unit throws on it.
// The call asked the world, so the throw is no fact about the declaration (LEAN_BREAK=closed-call claims it).
import { measure } from "lean-declared-fake";

export function width(s: string): number {
  const w = measure(s);
  if (typeof w !== "number") throw new Error("measure answered no number");
  return w;
}

// A module constant the world answered at load, tested for truth in the unit: a handle is truthy and its test runs no
// trap, so the call's own trace is empty. The load asked the package, so the graph is a world graph: no fault
const READY = measure("ready") ? true : false;
export function ready(s: string): string {
  if (READY) throw new Error("not ready");
  return s;
}
