import type { Outbox } from "./ports";

/** a gate built in this file: a bare return ends its constructor early, `new` still yields the gate */
export class Gate {
  limit: number;

  constructor(limit: number) {
    this.limit = 0;
    if (limit < 0) return;
    this.limit = limit;
  }

  admits(n: number): boolean {
    return n <= this.limit;
  }
}

/** sends a positive amount and returns it; the bare return yields undefined and skips the send */
export function notify(out: Outbox, n: number): number | undefined {
  if (n <= 0) return;
  out.send(n);
  return n;
}

/** the badge of a name, undefined for an empty name: the declared result admits undefined */
export function badge(s: string): string | undefined {
  if (s.length === 0) return;
  return s + "!";
}

/** the length of a name, undefined for an empty one: the inferred result admits undefined */
export function size(s: string) {
  if (s.length === 0) return;
  return s.length;
}
