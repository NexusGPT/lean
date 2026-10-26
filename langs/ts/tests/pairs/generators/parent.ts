declare const console: { log(n: number): void };
export function* changed(n: number): Generator<number, void, unknown> {
  yield n;
  yield n + 1;
}
export function consume(n: number): number[] {
  const out: number[] = [];
  for (const x of changed(n)) out.push(x);
  return out;
}
export function* two(n: number): Generator<number, void, unknown> {
  yield n;
  yield n + 1;
}
export function refactor(n: number): number[] {
  return Array.from(two(n));
}
export function* composed(n: number): Generator<number, void, unknown> {
  yield* two(n);
  yield* [n + 2];
}
export function composition(n: number): number[] {
  return [...composed(n)];
}
export function* counted(n: number): Generator<number, void, unknown> {
  for (let i = 0; i < 3; i++) {
    if (i > 0) yield n + i;
  }
}
export function collectCounted(n: number): number[] {
  return [...counted(n)];
}
export async function outside(it: AsyncIterable<number>): Promise<number[]> {
  const out: number[] = [];
  let first = true;
  for await (const x of it) {
    out.push(x);
    first = false;
  }
  return out;
}
export async function* streamed(n: number): AsyncGenerator<number, void, unknown> {
  console.log(n);
  yield n;
  console.log(n + 1);
  yield n + 1;
}
export async function interleave(n: number): Promise<number[]> {
  const out: number[] = [];
  for await (const x of streamed(n)) {
    console.log(x);
    out.push(x);
  }
  return out;
}
export function untouched(n: number): number { return n + 7; }

export function producerStep(n: number): number { return n + 1; }
export async function* deferred(n: number): AsyncGenerator<number, void, unknown> {
  yield producerStep(n);
}
export async function deferredConsumer(n: number): Promise<number[]> {
  const out: number[] = [];
  for await (const x of deferred(n)) out.push(x);
  return out;
}
export async function firstValue(it: AsyncIterable<number>): Promise<number> {
  for await (const x of it) return x;
  return 0;
}
export function outsideSync(it: Iterable<number>): number[] {
  const out: number[] = [];
  for (const x of it) out.push(x);
  return out;
}

export async function labelled(it: AsyncIterable<number>): Promise<number> {
  let sum = 0;
  outer: for await (const x of it) {
    if (x === 0) continue outer;
    sum += x;
  }
  return sum;
}
