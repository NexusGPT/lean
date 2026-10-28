export function strategy(n: number): number {
  const strategy = { count: n, run(x: number): number { return this.count - x; }, scale(x: number): number { return this.count * x; } };
  return strategy.run(2) + strategy.scale(3);
}
export function strategyRefactor(n: number): number {
  const strategy = { count: n, run(x: number): number { return this.count + x; }, scale(x: number): number { return this.count * x; } };
  return n + 2;
}
export class Changed {
  a: number = 2;
  b: number = 3;
  get total(): number { return this.a - this.b; }
  read(): number { return this.total; }
}
export class Inlined {
  a: number = 2;
  b: number = 3;
  get total(): number { return this.a + this.b; }
  read(): number { return this.a + this.b; }
}
export class Counter {
  stats: { n: number; deep: { n: number } } = { n: 0, deep: { n: 0 } };
  constructor() {}
  value(): number { return ++this.stats.deep.n; }
  valueRefactor(): number { return (this.stats.n += 1) + 0; }
  bump(): number { this.stats.n += 2; return this.stats.n; }
  refactor(): number { const stats = this.stats; this.stats = { ...stats, deep: { ...stats.deep, n: stats.deep.n + 1 } }; return this.stats.deep.n; }
}
export function recordRefactor(): number { const c = new Counter(); return c.refactor(); }
export class Writable {
  a: number = 1;
  get total(): number { return this.a; }
  set total(v: number) { this.a = v; }
  post(): number { return ++this.total; }
  valueRefactor(v: number): number { this.total = v; return v; }
  assign(v: number): number { this.total = v; return this.total; }
}
export function untouched(x: number): number { return x + 1; }
export function getterInstance(): number { const c = new Changed(); return c.total; }
export function effectStrategy(n: number, svc: { log(n: number): void }): number {
  const handler = { n, run(x: number): number { svc.log(this.n + 1); return x; } };
  return handler.run(4);
}
export class OpaqueGetter {
  a: number = 1;
  get bit(): number { return this.a & 2; }
  read(): number { return this.bit; }
}
export function literalGetter(n: number): number {
  const obj = { count: n, get total(): number { return this.count + 2; }, run(x: number): number { return this.count + x; } };
  return obj.total;
}
export function effectGetter(n: number, svc: { value(n: number): number }): number {
  const obj = { get total(): number { return svc.value(n + 1); } };
  return obj.total;
}
export function siblingCapture(n: number): number {
  const seed = n + 1;
  const obj = { read(): number { return seed; }, run(): number { return this.read(); } };
  return obj.run();
}
