// expect: property-assign
// a static of a class declared in another file is that file's state: writing it here is a write this unit does not own
import { Registry } from "./registry";
export function register(n: number): number {
  Registry.count = n;
  return n;
}
