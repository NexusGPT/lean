// The file links a package lean fakes, and uses it only as a callee: any reading of it is a trap, a trace entry. A unit
// that never calls it asks the world nothing, so its throw on an admitted input is a fact (a new:fault)
import { measure } from "lean-declared-fake";

export function widthOf(s: string): unknown {
  return measure(s);
}

export function last(s: string | undefined): string {
  return s!.slice(-1);
}
