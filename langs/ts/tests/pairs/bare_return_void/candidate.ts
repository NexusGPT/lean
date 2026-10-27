import type { Outbox } from "./ports";

/** a gate built in this file: the early return is now a guarded write, the same transitions */
export class Gate {
  limit: number;

  constructor(limit: number) {
    this.limit = 0;
    if (limit >= 0) {
      this.limit = limit;
    }
  }

  admits(n: number): boolean {
    return n <= this.limit;
  }
}

/** sends a non-negative amount: zero is now sent and returned, where the parent's bare return skipped it */
export function notify(out: Outbox, n: number): number | undefined {
  if (n < 0) return;
  out.send(n);
  return n;
}

/** the badge of a name, written as one conditional with an explicit undefined */
export function badge(s: string): string | undefined {
  return s.length === 0 ? undefined : s + "!";
}

/** the length of a name, undefined for an empty one: the inferred result admits undefined */
export function size(s: string) {
  if (s.length === 0) return;
  return s.length;
}
