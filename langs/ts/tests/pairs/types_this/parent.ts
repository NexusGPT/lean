// form 4 of the types inventory: the polymorphic `this` type of a class, read as the class's instance type
export class Query {
  parts: string[] = [];
  limit = 0;
  // a fluent method: adds a part and returns the receiver
  where(p: string): this {
    this.parts.push(p);
    return this;
  }
  // a fluent method: sets the limit and returns the receiver
  take(n: number): this {
    this.limit = n;
    return this;
  }
  // a fluent method: raises the limit and returns the receiver
  skip(n: number): this {
    this.limit = this.limit + n;
    return this;
  }
  // the chain read back
  text(): string {
    return this.parts.join(" and ");
  }
  // takes another value of the receiver's type
  longer(other: this): boolean {
    return this.parts.length > other.parts.length;
  }
  // takes another value of the receiver's type
  sameLimit(other: this): boolean {
    return this.limit === other.limit;
  }
}

// a subclass calling the chain it inherits
export class Named extends Query {
  name = "";
  both(a: string, b: string): string {
    return this.where(a).where(b).text();
  }
  capped(a: string, n: number): number {
    return this.where(a).take(n).limit;
  }
}

// a second fluent class and its subclass, the same on both sides: a request on one of their instances is named by
// their code, which neither side changes
export class Path {
  segs: string[] = [];
  add(s: string): this {
    this.segs.push(s);
    return this;
  }
}
export class Route extends Path {
  joined(a: string, b: string): string {
    return this.add(a).add(b).segs.join("/");
  }
}

// a function calling the chain on a value of a subclass
export function built(r: Route, a: string, b: string): number {
  return r.add(a).add(b).segs.length;
}
