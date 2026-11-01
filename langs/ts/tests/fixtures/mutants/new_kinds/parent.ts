// The mutant study's fixture (tests/mutants-fixture.mjs) for exec/mutate.mjs's later kinds: one unit per kind, named by
// it, whose every planted change lane B shows.
export function flag(n: number): boolean {
  let seen = false;
  if (n > 3) { seen = true; }
  return seen;
}

export function pick(xs: number[], i: number): number | undefined {
  const v: number | undefined = xs[i];
  return v;
}

export function tally(xs: number[]): number {
  let t = 0;
  for (const x of xs) { t += x; }
  return t;
}

export function mix(a: number): number {
  return a / 4 + (a % 3) + 2 ** a;
}

export function eq(a: number, b: number): number {
  if (a == b) { return 1; }
  return a != 0 ? 2 : 3;
}

export function orDefault(n: number | undefined): number {
  return n ?? 5;
}

export function bits(a: number, b: number): number {
  return (a & b) ^ ((a | b) << 1) ^ (a >> 1) ^ (b >>> 3);
}

export function flip(ok: boolean, n: number): number {
  if (!ok) { return -n; }
  return ~n;
}

export function greet(name: string, tags: string[]): string {
  tags.push(`seen`);
  return `hi ${name}`;
}

export function pair(a: number): { x: number; y?: number } {
  return { x: a, y: a + 1 };
}

export function tail(xs: number[]): number[] {
  return xs.slice(1, 3);
}
