/* eslint-disable no-magic-numbers */
// a note that moves every line below it

export function parse(s: string): number {
  // @ts-expect-error
  const n: number = s;
  return Number(s) + n * 0;
}

export function shout(s: string): string {
  console.log(s);
  // @ts-ignore
  return s.toUpperCase();
}

export function legacy(x: number): number {
  // @ts-ignore
  return x + 1;
}
