// form 2 of the types inventory: a unit reads a type parameter of the declaration around it (a generic class, a
// generic function, a generic method) and takes it as its own
export class Shelf<T> {
  // every element, in order
  all(xs: T[]): T[] {
    const out: T[] = [];
    for (const x of xs) out.push(x);
    return out;
  }
  // every element but the first
  rest(xs: T[]): T[] {
    return xs.slice(1);
  }
  // the two elements as a list
  both(a: T, b: T): T[] {
    return [a, b];
  }
  // a method generic in U of a class generic in T: how often y occurs in ys, and how many xs there are
  count<U>(xs: T[], ys: U[], y: U): number {
    let n = xs.length;
    for (const z of ys) if (z === y) n = n + 1;
    return n;
  }
  // a method generic in U of a class generic in T: the first of ys, else y
  pick<U>(xs: T[], ys: U[], y: U): U {
    return ys.length > 0 ? ys[0] : y;
  }
}

// a constructor storing a value of the class's type parameter
export class Holder<D> {
  value: D;
  constructor(d: D) {
    this.value = d;
  }
}

// a callback inside a generic function reads T from the function
export function marks<T>(rows: T[], x: T): boolean[] {
  return rows.map((r) => r === x);
}

// a callback inside a callback inside a generic function
export function grid<T>(rows: T[], cols: T[]): boolean[][] {
  return rows.map((r) => cols.map((c) => r === c));
}
