// expect: callback-form
// a defaulted index parameter: JavaScript passes the index, so the default never applies; write an inline arrow
interface Log { write(x: string): void; }
let sink: Log | undefined;
function label(x: string, i = 0): string { sink?.write(x); return `${i}${x}`; }
export function labels(xs: string[]): string[] {
  return xs.map(label);
}
