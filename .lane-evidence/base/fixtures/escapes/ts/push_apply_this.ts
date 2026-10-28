// expect: unsupported-member
// a receiver reached through `this` is left to the direct form: write this.items.push(...b) (design/push-apply.md)
export class Bag {
  items: string[] = [];
  addAll(b: string[]): number {
    this.items.push.apply(this.items, b);
    return this.items.length;
  }
}
