// expect: exception-callback
// a throwing unit passed by name: a function value has no fault channel
interface Log { write(x: string): void; }
let sink: Log | undefined;
function check(x: string): string { if (!x) throw new Error('empty'); sink?.write(x); return x; }
export function checked(xs: string[]): string[] {
  return xs.map(check);
}
