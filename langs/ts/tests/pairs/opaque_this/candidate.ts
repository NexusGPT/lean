// An arrow has no `this` of its own: inside a class method it reads the method's receiver, a binding that never changes
// (w1e, design/w1e-opaque-this-globals.md). A callback unit under the method takes that receiver as a captured input,
// as it takes a captured parameter, and is graded; before, it was refused `this` outside a class method.
export class Pricer {
  constructor(private readonly tax: number, private readonly fee: number) {}

  unit(n: number): number {
    return n * this.tax;
  }

  // (a) the callback is unchanged; the candidate changes the method around it (what it does with the mapped list)
  totals(xs: number[]): number[] {
    return xs.map((x) => x * this.tax + 1).slice(1);
  }

  // (b) the candidate changes the callback itself
  shifted(xs: number[]): number[] {
    return xs.map((x) => (x + 1) * this.tax);
  }

  // (c) the candidate is mutate.mjs's planted change inside the callback (a boundary literal)
  planted(xs: number[]): number[] {
    return xs.map((x) => x * this.tax + 3);
  }

  // (d) the receiver is lexical through an arrow between: both callbacks are unchanged, the method around them changes
  table(xs: number[], ys: number[]): number[][] {
    return xs.map((x) => ys.map((y) => x * this.tax + y)).slice(1);
  }

  // (e) the receiver is an input whose fields are told apart: the candidate reads another field of it
  fees(xs: number[]): number[] {
    return xs.map((x) => x + this.fee);
  }
}
