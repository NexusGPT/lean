// expect: closure-mutation
// a callback handed to an outside call runs when the outside decides: an outer cell written there is not a loop's state
interface Bus { on(name: string, cb: (n: number) => void): void; }
export function count(bus: Bus): number {
  let seen = 0;
  bus.on("tick", (n) => { seen = seen + n; });
  return seen;
}
