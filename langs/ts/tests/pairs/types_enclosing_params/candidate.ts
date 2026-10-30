// form 2 of the types inventory: a unit reads a type parameter of the declaration around it (a generic class, a
// generic function, a generic method) and takes it as its own
export class Shelf<T> {
  // every element, in order
  all(xs: T[]): T[] {
    const out: T[] = [];
    for (const y of xs) out.push(y);
    return out;
  }
  // every element but the first
  rest(xs: T[]): T[] {
    return xs.slice(2);
  }
  // the two elements as a list
  both(a: T, b: T): T[] {
    return [b, a];
  }
  // a method generic in U of a class generic in T: how often y occurs in ys, and how many xs there are
  count<U>(xs: T[], ys: U[], y: U): number {
    let n = xs.length;
    for (const z of ys) if (y === z) n = n + 1;
    return n;
  }
  // a method generic in U of a class generic in T: the first of ys, else y
  pick<U>(xs: T[], ys: U[], y: U): U {
    return ys.length === 0 ? y : ys[0];
  }
}

// a constructor storing a value of the class's type parameter
export class Holder<D> {
  value: D;
  constructor(d: D) {
    const v = d;
    this.value = v;
  }
}

// a callback inside a generic function reads T from the function
export function marks<T>(rows: T[], x: T): boolean[] {
  return rows.map((r) => x === r);
}

// a callback inside a callback inside a generic function
export function grid<T>(rows: T[], cols: T[]): boolean[][] {
  return rows.map((r) => cols.map((c) => c !== r));
}

// a field the class declares at its type parameter, read through `this` in an abstract class
export type Kind = "a" | "b";
export abstract class Note<TKind extends Kind = Kind> {
  abstract readonly kind: TKind;
  label(): Kind {
    const k = this.kind;
    return k;
  }
}

// a field holding a generic function value: the signature's own O is fixed at each call, not by this class
type Parse = <O>(text: string, options?: O) => string;
export class Reader {
  parse: Parse;
  constructor(p: Parse) {
    const q = p;
    this.parse = q;
  }
}

// a constructor runs its class's field initialisers, which read the class's type parameter
export class Bin<T> {
  items: T[] = [];
  count: number;
  constructor(n: number) {
    const m = n;
    this.count = m;
  }
}
