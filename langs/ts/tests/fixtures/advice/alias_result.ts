// expect: alias-mutation migration
// a change through a same-file call's result: return a copy from the callee, or mutate through the field
export class Bag {
  private readonly items = new Set<string>();
  private held(): Set<string> {
    return this.items;
  }
  put(x: string): number {
    const s = this.held();
    s.add(x);
    return this.items.size;
  }
}
