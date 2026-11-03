// units no parent holds that hand out a function, or call the one they are handed: the proposed test calls what they hand
// out as lean drove it, and passes a spy for the callback (design/w9am-handed-functions.md)
export function makeAdder(n: number): (x: number) => number {
  return (x: number) => x + n;
}
export function counter(start: number) {
  let n = start;
  return {
    next(): number { n += 1; return n; },
    reset(): void { n = start; },
  };
}
export function mapAll(items: string[], f: (s: string) => number): number[] {
  const out: number[] = [];
  for (const s of items) out.push(f(s));
  return out;
}
