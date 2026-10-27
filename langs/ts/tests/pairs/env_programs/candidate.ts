// Environment programs: what the environment does later with what a unit handed it.
// the same closure over a counter that starts at 1: its first invocation differs, and only an invocation shows it
export function makeCounter(): () => number { let n = 1; return () => { n += 1; return n; }; }
// the same handler over a limit of 2: the first event agrees, the second differs, and only a second event shows it
export function subscribe(bus: { on(name: string, handler: (e: { id: number }) => void): void }, seen: number[]): void { let k = 0; const limit = 2; bus.on("tick", (e) => { k += 1; seen.push(e.id); if (k > limit) seen.push(e.id); }); }
// the generator yields the same values
export function* countTo(n: number): Generator<number, void, unknown> { let i = 0; while (i < n) { i += 1; yield i; } }
