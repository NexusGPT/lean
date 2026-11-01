// An arrow has no `this` of its own: inside a class method it reads the method's receiver, a binding that never changes
// (w1e, design/w1e-opaque-this-globals.md). A callback unit under the method takes that receiver as a captured input,
// as it takes a captured parameter, and is graded; before, a call on `this` in it was refused `this` outside a class
// method (the census shape: `rows.map((r) => this.toDto(r))`).
export class Pricer {
  constructor(private readonly tax: number) {}

  // private: no subclass can hold another `scale` (TS2415), so `this.scale` is the class's own unit
  private scale(x: number): number {
    return x * this.tax;
  }

  // (a) the callback is unchanged; the candidate changes the method around it (what it does with the mapped list)
  totals(xs: number[]): number[] {
    return xs.map((x) => this.scale(x) + 1).slice(1);
  }

  // (b) the candidate changes the callback itself
  shifted(xs: number[]): number[] {
    return xs.map((x) => this.scale(x + 1));
  }

  // (c) the candidate is mutate.mjs's planted change inside the callback (a boundary literal)
  planted(xs: number[]): number[] {
    return xs.map((x) => this.scale(x) + 3);
  }

  // (d) the receiver is lexical through an arrow between: both callbacks are unchanged, the method around them changes
  table(xs: number[], ys: number[]): number[][] {
    return xs.map((x) => ys.map((y) => this.scale(x) + y)).slice(1);
  }
}

// An exported class: a subclass in another file may hold another `rate`, so `this.rate(x)` is a request of the world
// named by the code of the class (translate.mjs heldKey). The callback's text is unchanged; the method it calls changes
// at one input only, outside the callback.
export class Ledger {
  constructor(private readonly base: number) {}

  rate(x: number): number {
    if (x === 7919) return x;
    return x + this.base;
  }

  // (e) the callback is unchanged, its callee `rate` is not
  rates(xs: number[]): number[] {
    return xs.map((x) => this.rate(x) * 2);
  }
}
