// Environment programs: what the environment does later with what a unit handed it.
// a counter closure: the environment keeps it and calls it again
export function makeCounter(): () => number { let n = 0; return () => { n += 1; return n; }; }
// a handler handed to a bus: the environment fires it later with an event; from the second event on it records twice
export function subscribe(bus: { on(name: string, handler: (e: { id: number }) => void): void }, seen: number[]): void { let k = 0; const limit = 1; bus.on("tick", (e) => { k += 1; seen.push(e.id); if (k > limit) seen.push(e.id); }); }
// a generator driven step by step
export function* countTo(n: number): Generator<number, void, unknown> { for (let i = 1; i <= n; i++) yield i; }
