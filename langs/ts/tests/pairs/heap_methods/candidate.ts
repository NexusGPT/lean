// The heap core, stage 4: an instance method reads and writes the fields of `this` through the heap.
type Item = { id: string; n: number };

/** @sealed */
export class Bag {
  count: number;
  items: Item[];
  constructor() { this.count = 0; this.items = []; }
  // keeps the item and counts it twice: a changed write to a field of this
  add(it: Item): number {
    this.items.push(it);
    this.count = this.count + 2;
    return this.count;
  }
  // the number of items kept
  size(): number {
    return this.items.length;
  }
  // the same writes through local names of the fields, the size read in place
  grow(): number {
    const c = this.count;
    this.count = c + 2;
    const items = this.items;
    return items.length;
  }
  // reads both fields
  total(): number {
    return this.count + this.items.length;
  }
}
