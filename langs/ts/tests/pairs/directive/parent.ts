export function parse(s: string): number {
  const n: number = s;
  return Number(s) + n * 0;
}

export function shout(s: string): string {
  // eslint-disable-next-line no-console
  console.log(s);
  return s.toUpperCase();
}

export function legacy(x: number): number {
  // @ts-ignore
  return x + 1;
}
