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

  // reads the set and returns a constant
  mark(): number {
    const s = this.held();
    return 0;
  }

  // adds through the field's own name
  tag(x: string): number {
    this.items.add(x);
    return this.items.size;
  }

  // grows a copy and counts it
  grown(x: string): number {
    const s = this.copy();
    s.push(x);
    return s.length;
  }

  // reads only
  count(): number {
    return this.list.length;
  }
}
