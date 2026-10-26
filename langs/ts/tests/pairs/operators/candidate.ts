export function sum(...xs: number[]): number {
  let t = 0;
  for (const x of xs) t += x;
  return t;
}
export function total(a: number, b: number, rest: readonly number[]): number {
  return sum(a, b) + sum(...rest);
}
export function headTail(xs: readonly number[]): number {
  const [first = 0, ...others] = xs;
  return first + others.length + 1;
}
export function withDefault(label: string | undefined, fallback: string): string {
  let l = label;
  l ??= fallback + "!";
  return l;
}
export function area(side: number): number {
  return side ** 2;
}
