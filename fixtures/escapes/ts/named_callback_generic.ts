// expect: callback-form
// a generic same-file function passed by name as an effectful callback: its type arguments are not fixed
interface Log { write(x: string): void; }
let sink: Log | undefined;
function record<T>(x: T): T { sink?.write(String(x)); return x; }
export function all(xs: string[]): string[] {
  return xs.map(record);
}
