// Units no parent holds, their returned values read against the declared return type (design/w1h-new-units.md).

// (a) the signature says string; a positive input returns the number itself: new:shape
export function label(n: number): string {
  return (n > 0 ? n : String(n)) as any;
}

// (b) the same unit, keeping its promise: no record
export function labelOk(n: number): string {
  return String(n);
}

// (c) no declared return type: the checker infers it from the body, which is no declaration of it, so no shape is claimed
export function inferred(n: number) {
  return n > 0 ? n : "negative";
}

// (d) void: the caller ignores the result, so a value returned is outside no promise
export function notify(n: number): void {
  return n as any;
}

// (e) a promise of a string resolving to a number: new:shape on the awaited value
export async function later(n: number): Promise<string> {
  return n as any;
}

// (f) a record missing a required field: new:shape
export function point(n: number): { x: number; y: number } {
  return { x: n } as any;
}

// (g) a nullable return, both options returned: no record
export function maybe(n: number): string | null {
  return n > 0 ? "positive" : null;
}

// (h) a returned closure that writes into the returned value: lane B's observer drives it after the return with a handle
// (run.mjs driveWindow), so what the value holds afterwards is not what the unit returned: no record
export function recorder(): { calls: number[]; api: { push(n: number): void } } {
  const calls: number[] = [];
  return { calls, api: { push: (n: number) => { calls.push(String(n) as any); } } };
}
