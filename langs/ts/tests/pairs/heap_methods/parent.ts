// The heap core, stage 4: an instance method reads and writes the fields of `this` through the heap.
type Item = { id: string; n: number };

/** @sealed */
export class Bag {
  count: number;
  items: Item[];
  constructor() { this.count = 0; this.items = []; }
  // keeps the item and counts it
  add(it: Item): number {
    this.items.push(it);
    this.count = this.count + 1;
    return this.count;
  }
  // the number of items kept
  size(): number {
    return this.items.length;
  }
  // counts two more and answers the size through a method of the same instance
  grow(): number {
    this.count = this.count + 2;
    return this.size();
  }
  // reads both fields
  total(): number {
    return this.count + this.items.length;
  }
}
