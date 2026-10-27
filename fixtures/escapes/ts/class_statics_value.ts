// expect: global-read
// a static method passed as a value has no unit call at the site; call it inside an arrow
export class Fmt {
  static up(s: string): string {
    return s.toUpperCase();
  }
}
export function pick(flag: boolean): (s: string) => string {
  const f = Fmt.up;
  return flag ? f : (s: string) => s;
}
