// expect: exception-callback
// a throwing unit stored in an object handed to an outside function: the outside decides when and whether it runs, and
// the stored function value has no fault channel here; hand the unit to the call itself, or call it in the unit
interface Bus { on(handlers: { message: (s: string) => number }): void; }
export function parse(s: string): number {
  if (s === "") throw new Error("empty");
  return s.length;
}
export function listen(bus: Bus): void {
  bus.on({ message: parse });
}
