// Units no parent holds, in a module whose graph asks the world at load (lane w9k, exec/new-unit.mjs unitWorld): the
// world a unit's call can read is what the code it reaches names, not the whole module graph.
import { measure } from "lean-declared-fake";

// a package answer kept at load, in a binding only `ready` reaches: its call may read it with no trap, so no fault
const READY = measure("ready") ? true : false;
export function ready(s: string): string {
  if (READY) throw new Error("not ready");
  return s;
}

// (a) reaches nothing the world answered: its throw on a drawn input is a fact (new:fault). LEAN_BREAK=unit-reach
// reads the whole graph (loading asked the package), LEAN_BREAK=real-buffer reads `Buffer` as a world handle: no record
export function hexOf(s: string): string {
  return Buffer.from(s).toString("hexx" as any);
}

// (b) the same call with an encoding Node holds: no record
export function hexOr(s: string): string {
  return Buffer.from(s).toString("hex");
}

// (m) the unit's own throw on an input it rejects: a validator. The record says so (built: program); the engine's raise
// in hexOf says built: engine (LEAN_BREAK=fault-origin calls every fault the engine's)
export function nonEmpty(s: string): string {
  if (s.length === 0) throw new Error("empty");
  return s;
}

// (n) a global the build defines (React's __DEV__): the sandbox has none, the ReferenceError is lean's, a coverage record
// (LEAN_BREAK=undefined-global: a fault)
declare const __DEV__: boolean;
export function devOnly(s: string): string {
  return __DEV__ ? s : "";
}
