import { Base } from "./base";

/** an item over the base: it formats, labels and counts through the methods it inherits */
export class Item extends Base {
  render(x: number): string {
    return this.format(x) + "!";
  }
  tag(s: string): string {
    return this.label(s) + ":";
  }
  title(s: string): string {
    return this.label(s).toUpperCase();
  }
  next(): number {
    return this.bump();
  }
  show(x: number): string {
    return this.describe(x);
  }
  word(x: number): string {
    return "[" + x + "]";
  }
  size(s: string): number {
    return s.length;
  }
  stamp(x: number): string {
    return super.stamp(x) + "*";
  }
  note(x: number): string {
    return super.note(x) + "+";
  }
}
