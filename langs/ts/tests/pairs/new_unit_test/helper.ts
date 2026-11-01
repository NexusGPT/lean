// a fixture helper of the tests: it asks the package lean fakes
import { measure } from "lean-declared-fake";
export function sized(s: string): unknown {
  return measure(s);
}
