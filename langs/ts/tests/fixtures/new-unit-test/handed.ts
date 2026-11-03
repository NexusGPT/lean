// units that hand out a function: the test calls what they hand out (design/w9am-handed-functions.md)
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
// a unit that calls the callback it is given, once per item
export function mapAll(items: string[], f: (s: string) => number): number[] {
  const out: number[] = [];
  for (const s of items) out.push(f(s));
  return out;
}
// a method that reads its holder through `this`: the test calls it as `out.inc()`, on the value the unit returned
export function tally(n: number) {
  return { n, inc(): number { this.n += 1; return this.n; } };
}
// a closure that calls the callback it was given only when it is called: the spy answers the drives' calls too
export function deferred(f: () => number): () => number {
  return () => f() + 1;
}
// a closure that reads a member of what the callback answers: a request no spy answers by value (lean's world), so no
// test restates it and the refusal names the handed-out function
export function reader(src: () => { read(): string }): () => string {
  return () => src().read();
}
