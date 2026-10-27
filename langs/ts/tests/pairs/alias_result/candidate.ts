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
