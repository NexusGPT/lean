// A same-file call's result under another name: a change through it is a change of whatever the callee returned.
export class Box {
  private readonly items = new Set<string>();
  private readonly list: string[] = [];

  // returns the receiver's own set: the caller's local is another name for the field
  private held(): Set<string> {
    return this.items;
  }

  // the same set, one call further
  private view(): Set<string> {
    return this.held();
  }

  // returns a copy: no other name reaches the result
  private fresh(): string[] {
    return [...this.list];
  }

  // the copy, one call further: fresh through its callee
  private copy(): string[] {
    return this.fresh();
  }

  // changed: adds to the receiver's set through the call result
  mark(): number {
    const s = this.held();
    s.add("x");
    return 0;
  }

  // the same add, through a call result two calls from the field: refused, the lint cannot see that the names agree
  tag(x: string): number {
    const s = this.view();
    s.add(x);
    return this.items.size;
  }

  // refactor: the copy counted before the push, one more after it
  grown(x: string): number {
    const s = this.copy();
    const n = s.length;
    s.push(x);
    return n + 1;
  }

  // reads only
  count(): number {
    return this.list.length;
  }
}

type Row = { n: number; label: string };

// changed: writes the found row, which is the caller's row (find returns an element, not a copy)
export function bump(rs: Row[]): number {
  const t = rs.find((r) => r.n > 0);
  if (t) t.n = t.n + 1;
  return t ? t.n - 1 : 0;
}

// refactor: map returns a new array, so the push changes only the copy; counted before the push, one more after it
export function counts(rs: Row[]): number {
  const xs = rs.map((r) => r.n);
  const k = xs.length;
  xs.push(0);
  return k + 1;
}
