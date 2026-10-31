// form 4 of the types inventory: the polymorphic `this` type of a class, read as the class's instance type
export class Query {
  parts: string[] = [];
  limit = 0;
  // a fluent method: adds a part and returns the receiver
  where(p: string): this {
    const part = p;
    this.parts.push(part);
    return this;
  }
  // a fluent method: sets the limit and returns the receiver
  take(n: number): this {
    this.limit = n;
    return this;
  }
  // the chain read back
  text(): string {
    return this.parts.join(" and ");
  }
  // takes another value of the receiver's type
  longer(other: this): boolean {
    return other.parts.length < this.parts.length;
  }
  // takes another value of the receiver's type
  sameLimit(other: this): boolean {
    return this.limit === other.parts.length;
  }
}

// a subclass calling the chain it inherits
export class Named extends Query {
  name = "";
  both(a: string, b: string): string {
    return this.where(b).where(a).text();
  }
  capped(a: string, n: number): number {
    const self = this.where(a);
    return self.take(n).limit;
  }
}

// a function calling the chain on a value of the subclass
export function built(q: Named, a: string, n: number): number {
  const r = q.where(a);
  return r.take(n).limit;
}
